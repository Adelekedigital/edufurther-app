'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  currentSubscription,
  pushPermission,
  pushSupported,
  setAppBadge,
  subscribeDevice,
} from '@/lib/utils/push';
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

/** null: push isn't set up on the server (503), so it's never offered. */
async function readConfig(signal: AbortSignal): Promise<string | null> {
  const { data, error, response } = await api.GET('/api/v1/push/config', { signal });
  if (response.status === 503) return null;
  if (!data) throw apiError(response.status, error, response);
  return data.vapid_public_key;
}

/** On: this device is subscribed and the server has it for this account. */
async function readDevice(signal: AbortSignal): Promise<boolean> {
  if (pushPermission() !== 'granted') return false;
  const sub = await currentSubscription();
  if (!sub) return false;
  const { data, error, response } = await api.GET('/api/v1/me/push-subscriptions', {
    params: { query: { endpoint: sub.endpoint } },
    signal,
  });
  if (!data) throw apiError(response.status, error, response);
  return data.subscribed;
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
  const status = useQuery({
    queryKey: deviceKey,
    enabled: usable && vapidKey !== null,
    retry: retryOnce,
    queryFn: ({ signal }) => readDevice(signal),
  });

  const enable = useMutation({
    mutationFn: async (permission: Promise<NotificationPermission>) => {
      if ((await permission) !== 'granted') throw new PushBlocked();
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

  const turnOn = useCallback(() => {
    if (!vapidKey || enable.isPending || disable.isPending) return;
    disable.reset();
    // Asked now, in the tap itself: awaiting anything first loses it on iOS.
    enable.mutate(Notification.requestPermission());
  }, [vapidKey, enable, disable]);

  const turnOff = useCallback(() => {
    if (enable.isPending || disable.isPending) return;
    enable.reset();
    disable.mutate();
  }, [enable, disable]);

  let state: PushState;
  if (!usable || config.isError || (config.isSuccess && vapidKey === null)) state = 'hidden';
  else if (device.permission === 'denied') state = 'blocked';
  else if (status.data === undefined) state = status.isError ? 'off' : 'loading';
  else state = status.data ? 'on' : 'off';

  const failed = enable.error ?? disable.error;
  const failure: PushFailure | null = !failed
    ? null
    : failed instanceof PushBlocked
      ? 'blocked'
      : 'failed';

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
  await Promise.race([work, new Promise((r) => setTimeout(r, 2000))]);
}
