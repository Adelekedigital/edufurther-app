'use client';

import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  currentSubscription,
  pushPermission,
  pushSupported,
  setAppBadge,
  subscribeDevice,
} from '@/lib/utils/push';
import { track } from '@/lib/analytics/track';
import { within } from '@/lib/utils/within';
import { apiError, retryOnce } from './errors';
import { api } from './http';
import { keys } from './keys';
import { isPreviewing } from './previewStore';
import { usePreview } from './preview';

/**
 * Push notifications on this device (decision 312, backend #386):
 * - GET /push/config: the server's key. 503 means push isn't set up there,
 *   and then nothing is offered (no switch, no ask).
 * - GET/POST/DELETE /me/push-subscriptions: this device, for this account.
 * Never inside Preview as user: those routes answer 403 there, and the device
 * is the admin's, not the previewed person's.
 */

export type PushState =
  /** Nothing to offer: unsupported here, push not set up, or a preview. */
  | 'hidden'
  | 'loading'
  /** The browser or phone refuses: only its own settings can undo that. */
  | 'blocked'
  | 'on'
  | 'off';

export type PushFailure = 'blocked' | 'failed';

class PushBlocked extends Error {}
/** The prompt was closed without an answer: nothing is blocked, it can be asked again. */
class PushDismissed extends Error {}

/** null: push isn't set up on the server (503), so it's never offered. */
async function readConfig(signal: AbortSignal): Promise<string | null> {
  const { data, error, response } = await api.GET('/api/v1/push/config', { signal });
  if (response.status === 503) return null;
  if (!data) throw apiError(response.status, error, response);
  return data.vapid_public_key;
}

/**
 * On: this device is subscribed and the server has it for this account. A
 * subscription here that isn't this account's is dropped: it was left by
 * someone whose session ended without Logout, and would keep showing them
 * their notifications on this device.
 */
async function readDevice(signal: AbortSignal): Promise<boolean> {
  const sub = await currentSubscription();
  if (!sub) return false;
  const { data, error, response } = await api.GET('/api/v1/me/push-subscriptions', {
    params: { query: { endpoint: sub.endpoint } },
    signal,
  });
  if (!data) throw apiError(response.status, error, response);
  if (!data.subscribed) await sub.unsubscribe().catch(() => false);
  return data.subscribed && pushPermission() === 'granted';
}

/*
 * Client-only facts (support, permission) as an external store: the server
 * render and the first client pass both read "unsupported", then the real
 * value. Re-read on focus (permission changed in the phone's settings) and
 * after a change made here.
 */
const factListeners = new Set<() => void>();
function subscribeFacts(listener: () => void) {
  factListeners.add(listener);
  window.addEventListener('focus', listener);
  return () => {
    factListeners.delete(listener);
    window.removeEventListener('focus', listener);
  };
}
const refreshFacts = () => factListeners.forEach((l) => l());
const factsNow = () => `${pushSupported() ? 1 : 0}|${pushPermission()}`;
const factsOnServer = () => '0|default';

function useDeviceFacts() {
  const [supported, permission] = useSyncExternalStore(
    subscribeFacts,
    factsNow,
    factsOnServer,
  ).split('|');
  return { supported: supported === '1', permission: permission as NotificationPermission };
}

/**
 * This device's notifications for `userId` (null: not a member yet, nothing
 * is read). `turnOn` must run straight from a tap: the permission prompt is
 * asked before anything is awaited, as iOS and Safari require.
 */
export function usePushNotifications(userId: string | null) {
  const qc = useQueryClient();
  const previewing = usePreview().sessionId !== null;
  const device = useDeviceFacts();
  const usable = device.supported && !previewing && userId !== null;

  const config = useQuery({
    queryKey: keys.push.config,
    enabled: usable,
    staleTime: 5 * 60_000,
    retry: retryOnce,
    queryFn: ({ signal }) => readConfig(signal),
  });
  const vapidKey = config.data ?? null;

  const deviceKey = keys.push.device(userId ?? 'none');
  const [changing, setChanging] = useState(false);
  const status = useQuery({
    queryKey: deviceKey,
    // Not while a change is on its way: a read between the new subscription
    // and its POST would find it unknown to the server and drop it.
    enabled: usable && vapidKey !== null && !changing,
    retry: retryOnce,
    queryFn: ({ signal }) => readDevice(signal),
  });

  const enable = useMutation({
    mutationFn: async ({
      permission,
      before,
    }: {
      permission: Promise<NotificationPermission>;
      /** The permission before this ask: already granted is no new grant. */
      before: NotificationPermission;
    }) => {
      const answer = await permission;
      if (answer === 'denied') throw new PushBlocked();
      if (answer !== 'granted') throw new PushDismissed();
      // PRD 30 push reach: the person said yes, just now (once per ask).
      if (before !== 'granted') track('push_permission_granted', {});
      const sub = await subscribeDevice(vapidKey!);
      const { endpoint, keys: k, expirationTime } = sub.toJSON();
      if (!endpoint || !k?.p256dh || !k.auth) throw new Error('Incomplete push subscription');
      const { error, response } = await api.POST('/api/v1/me/push-subscriptions', {
        body: { endpoint, keys: { p256dh: k.p256dh, auth: k.auth }, expirationTime },
      });
      if (!response.ok) throw apiError(response.status, error, response);
      return true;
    },
    onSettled: refreshFacts,
    onSuccess: () => qc.setQueryData(deviceKey, true),
  });

  const disable = useMutation({
    mutationFn: async () => {
      const sub = await currentSubscription();
      if (sub) {
        const { error, response } = await api.DELETE('/api/v1/me/push-subscriptions', {
          body: { endpoint: sub.endpoint },
        });
        if (!response.ok) throw apiError(response.status, error, response);
        await sub.unsubscribe().catch(() => false);
      }
      return false;
    },
    onSuccess: () => qc.setQueryData(deviceKey, false),
  });

  // One change at a time, however fast the second tap: state lands a render later.
  const inFlight = useRef(false);
  const settle = {
    onSettled: () => {
      inFlight.current = false;
      setChanging(false);
    },
  };
  const begin = () => {
    inFlight.current = true;
    setChanging(true);
    void qc.cancelQueries({ queryKey: deviceKey });
  };

  const turnOn = useCallback(() => {
    if (!vapidKey || inFlight.current) return;
    begin();
    disable.reset();
    // Asked now, in the tap itself: awaiting anything first loses it on iOS.
    const before = Notification.permission;
    enable.mutate({ permission: Notification.requestPermission(), before }, settle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vapidKey, enable, disable]);

  const turnOff = useCallback(() => {
    if (inFlight.current) return;
    begin();
    enable.reset();
    disable.mutate(undefined, settle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enable, disable]);

  let state: PushState;
  if (!usable || config.isError || (config.isSuccess && vapidKey === null)) state = 'hidden';
  else if (!config.isSuccess) state = 'loading';
  else if (device.permission === 'denied') state = 'blocked';
  else if (status.data === undefined) state = status.isError ? 'off' : 'loading';
  else state = status.data ? 'on' : 'off';

  const failed = enable.error ?? disable.error;
  const failure: PushFailure | null =
    failed instanceof PushDismissed
      ? null
      : failed instanceof PushBlocked
        ? 'blocked'
        : failed || (status.isError && status.data === undefined)
          ? 'failed'
          : null;

  return {
    state,
    /** Not asked on this device yet: the one-time ask may show. */
    askable: state === 'off' && device.permission === 'default',
    busy: enable.isPending || disable.isPending,
    failure,
    turnOn,
    turnOff,
  };
}

/**
 * Sign-out's step, before the session ends (the DELETE needs the token):
 * this device stops getting this account's pushes. The server row goes, and
 * the subscription itself, so a push already on its way is refused too. In
 * a preview the DELETE would answer 403: only the subscription goes, and the
 * server forgets its row when the push service answers 410. Never holds
 * sign-out up past 2 s.
 */
export async function forgetPushForSignOut(): Promise<void> {
  setAppBadge(0);
  if (!pushSupported()) return;
  const work = (async () => {
    const sub = await currentSubscription();
    if (!sub) return;
    await Promise.all([
      isPreviewing()
        ? undefined
        : api
            .DELETE('/api/v1/me/push-subscriptions', { body: { endpoint: sub.endpoint } })
            .catch(() => undefined),
      sub.unsubscribe().catch(() => false),
    ]);
  })().catch(() => undefined);
  await within(2000, work);
}
