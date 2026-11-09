/**
 * The service worker's page side (ADR 0011). The worker itself is
 * src/lib/pwa/worker.js, served at /sw.js by src/app/sw.js.
 *
 * Off switch: NEXT_PUBLIC_SERVICE_WORKER=off (then redeploy). /sw.js then
 * serves a worker that removes itself and its caches (src/lib/pwa/killWorker.js),
 * which works even if the page's code can't run; and every page also
 * unregisters it from here.
 */

import { safeReturnTo } from './safeReturnTo';

export const SW_URL = '/sw.js';

/** The worker's "show this screen" request after a notification tap (worker.js). */
export const OPEN_MESSAGE = 'ef-open';

/**
 * Answers the worker's request to show a notification's screen: `open` moves
 * there with the app's router, and the worker is told it's done, so it doesn't
 * also navigate. Only a path on this site is ever opened (safeReturnTo, Home
 * otherwise). Returns the way to stop listening.
 */
export function listenForOpenRequests(open: (path: string) => void): () => void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return () => {};
  const sw = navigator.serviceWorker;
  const onMessage = (e: MessageEvent) => {
    const d = e.data as { type?: unknown; url?: unknown } | null;
    if (!d || d.type !== OPEN_MESSAGE || typeof d.url !== 'string') return;
    open(safeReturnTo(d.url, '/'));
    e.ports[0]?.postMessage('opened');
  };
  sw.addEventListener('message', onMessage);
  // A tap that woke the app may have queued its request before this listened.
  sw.startMessages?.();
  return () => sw.removeEventListener('message', onMessage);
}

/** Production only: a worker in dev serves yesterday's code (pwa-offline). */
export function serviceWorkerEnabled(): boolean {
  return process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SERVICE_WORKER !== 'off';
}

/** Registers the worker once the page has loaded, or removes it when switched off. */
export function setUpServiceWorker(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (process.env.NEXT_PUBLIC_SERVICE_WORKER === 'off') {
    void removeServiceWorker();
    return;
  }
  if (!serviceWorkerEnabled()) return;
  const register = () => {
    // A failed registration only means no cache: the app works the same.
    navigator.serviceWorker.register(SW_URL, { scope: '/' }).catch(() => {});
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

async function removeServiceWorker(): Promise<void> {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
    await clearAppCaches();
  } catch {
    // Nothing to remove, or the browser refused: nothing else to do.
  }
}

/**
 * Drops everything the worker keeps (all `ef-` caches): the off switch's
 * page-side half. Sign-out doesn't call it: the caches hold only code, images
 * and the offline page, nothing personal (ADR 0011).
 */
export async function clearAppCaches(): Promise<void> {
  try {
    if (typeof caches === 'undefined') return;
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith('ef-')).map((n) => caches.delete(n)));
  } catch {
    // Storage off or blocked: nothing was cached.
  }
}
