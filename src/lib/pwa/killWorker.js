/*
 * The service worker's off switch (ADR 0011), served at /sw.js instead of
 * worker.js when NEXT_PUBLIC_SERVICE_WORKER=off. The browser checks /sw.js
 * for updates on every page load (it is served no-cache), so this replaces a
 * bad worker without any of the page's code having to run: it handles no
 * requests, clears the app's caches and removes itself.
 */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith('ef-')).map((n) => caches.delete(n)));
      await self.registration.unregister();
    })(),
  );
});
