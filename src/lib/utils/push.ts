/**
 * The browser's half of push notifications (decision 312, backend #386): what
 * this device can do, its subscription, the app-icon badge, and the one-time
 * ask after a meaningful moment. No API calls here: those are in
 * lib/api/data/push.ts. The worker that shows a push is src/lib/pwa/worker.js.
 */
import { serviceWorkerEnabled } from './serviceWorker';
import { within } from './within';

/**
 * This device can take a push: a service worker, the Push API and
 * notifications. iOS has them only in an app added to the Home Screen
 * (16.4+), so a Safari tab on an iPhone is false and nothing is offered.
 */
export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    serviceWorkerEnabled() &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** 'granted', 'denied' or 'default' (not asked yet); 'denied' when unsupported. */
export function pushPermission(): NotificationPermission {
  return pushSupported() ? Notification.permission : 'denied';
}

/** The VAPID key (base64url) as the bytes `pushManager.subscribe` takes. */
export function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const padded = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * The worker's registration, or null at once when none is registered (it
 * failed, or hasn't happened yet): never waits on `ready`, which then never
 * comes.
 */
async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try {
    return (await within(2000, navigator.serviceWorker.getRegistration('/'))) ?? null;
  } catch {
    return null;
  }
}

/** This device's subscription, or null (none, unsupported, or no worker). */
export async function currentSubscription(): Promise<PushSubscription | null> {
  try {
    const reg = await registration();
    return (await reg?.pushManager.getSubscription()) ?? null;
  } catch {
    return null;
  }
}

/**
 * A fresh subscription to `vapidKey`. Any subscription already here is
 * dropped first, never reused: it may be another account's left behind by a
 * session that ended without Logout, or made with an older key.
 */
export async function subscribeDevice(vapidKey: string): Promise<PushSubscription> {
  const reg = await registration();
  if (!reg) throw new Error('No service worker to subscribe with');
  const existing = await reg.pushManager.getSubscription();
  if (existing) await existing.unsubscribe();
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyBytes(vapidKey),
  });
}

/**
 * Drops this device's subscription without asking the server, for a session
 * that ended without Logout (expired or revoked: no token to call with). The
 * push service then refuses the old row, and the server forgets it (410).
 */
export async function dropDeviceSubscription(): Promise<void> {
  setAppBadge(0);
  const sub = await currentSubscription();
  await sub?.unsubscribe().catch(() => false);
}

/** The app-icon badge: the unread messages count, cleared at 0. Where supported only. */
export function setAppBadge(count: number): void {
  try {
    if (typeof navigator === 'undefined') return;
    if (count > 0 && 'setAppBadge' in navigator) void navigator.setAppBadge(count).catch(() => {});
    else if ('clearAppBadge' in navigator) void navigator.clearAppBadge().catch(() => {});
  } catch {
    // No badge here: nothing to show.
  }
}

/* The one-time ask (owner, 2026-11-07: after a meaningful moment). */

const ASKED_KEY = 'ef-push-asked';

/** Asked on this device already (shown once, whatever the answer). */
export function pushAsked(): boolean {
  try {
    return localStorage.getItem(ASKED_KEY) === '1';
  } catch {
    // Storage off: treat it as asked, so the ask can't repeat on every moment.
    return true;
  }
}

export function markPushAsked(): void {
  try {
    localStorage.setItem(ASKED_KEY, '1');
  } catch {
    // Storage off: pushAsked() already says asked.
  }
}

export type PushMoment = 'message' | 'booking';

const momentListeners = new Set<(m: PushMoment) => void>();

/**
 * A meaningful moment happened: a message was sent, a booking made or
 * answered. The shell's PushPrompt may then offer notifications, once.
 */
export function notePushMoment(moment: PushMoment): void {
  momentListeners.forEach((l) => l(moment));
}

export function onPushMoment(listener: (m: PushMoment) => void): () => void {
  momentListeners.add(listener);
  return () => {
    momentListeners.delete(listener);
  };
}
