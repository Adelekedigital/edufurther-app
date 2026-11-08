/**
 * The browser's half of push notifications (decision 312, backend #386): what
 * this device can do, its subscription, the app-icon badge, and the one-time
 * ask after a meaningful moment. No API calls here: those are in
 * lib/api/data/push.ts. The worker that shows a push is src/lib/pwa/worker.js.
 */
import { serviceWorkerEnabled } from './serviceWorker';

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

function sameKey(sub: PushSubscription, key: Uint8Array): boolean {
  const current = sub.options?.applicationServerKey;
  if (!current) return false;
  const a = new Uint8Array(current);
  return a.length === key.length && a.every((b, i) => b === key[i]);
}

/** Never longer than `ms`: a worker that never gets ready mustn't hold anything up. */
function within<T>(ms: number, work: Promise<T>): Promise<T | null> {
  return Promise.race([work, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
}

/** This device's subscription, or null (none, unsupported, or no worker yet). */
export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  try {
    const reg = await within(3000, navigator.serviceWorker.ready);
    return (await reg?.pushManager.getSubscription()) ?? null;
  } catch {
    return null;
  }
}

/**
 * Subscribes this device to `vapidKey`, reusing a subscription made with the
 * same key. One made with an older key (a rotation) is replaced: the push
 * service would refuse the server's new signature.
 */
export async function subscribeDevice(vapidKey: string): Promise<PushSubscription> {
  const key = keyBytes(vapidKey);
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing && sameKey(existing, key)) return existing;
  if (existing) await existing.unsubscribe();
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
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
