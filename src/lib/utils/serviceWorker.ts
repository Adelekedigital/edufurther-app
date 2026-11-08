/**
 * The service worker's page side (ADR 0011). The worker itself is
 * public/sw.js.
 *
 * Off switch: NEXT_PUBLIC_SERVICE_WORKER=off (then redeploy) makes every
 * visit unregister the worker and drop its caches, the way out if a bad
 * worker ever ships. The worker never serves pages from its cache, so the
 * page carrying this code always comes from the network.
 */

export const SW_URL = '/sw.js';

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
 * Drops everything the worker keeps (all `ef-` caches). Called on sign-out:
 * the caches hold only code, images and the offline page, nothing personal,
 * but a shared device starts clean anyway.
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
