/*
 * EduFurther service worker (ADR 0011). Its one job: make a cold launch of the
 * installed app fast by keeping the app's code on the device, so nothing but
 * the page itself has to come over the network.
 *
 * What it never does, by design:
 * - serve a page from cache: pages are drawn per person (the session hint, the
 *   role), so a cached page could be someone else's. Pages are network-only,
 *   with navigation preload; only when the network fails is the static
 *   offline page shown instead.
 * - touch the API, or anything but GET: /api/* answers per person, and in
 *   "Preview as user" the same URL answers as someone else. Network only.
 * - touch other origins (Supabase, Google, the meeting hosts).
 *
 * Updates: skipWaiting + clients.claim. Safe here because no page comes from
 * the cache: a new worker can't put an old page against a new API, and the
 * code files an open page still asks for stay in the cache.
 */

const VERSION = 'v1';
const STATIC_CACHE = `ef-static-${VERSION}`;
const SHELL_CACHE = `ef-shell-${VERSION}`;
const OFFLINE_URL = '/offline.html';
/** Hashed code piles up across deploys; keep the newest this many. */
const STATIC_MAX_ENTRIES = 400;

/** Content-hashed build output (code, styles, fonts): the name is the version. */
const isHashed = (path) => path.startsWith('/_next/static/');
/** Fixed-name images: kept, but refreshed in the background. */
const isStaticImage = (path) =>
  path.startsWith('/brand/') ||
  path.startsWith('/illustrations/') ||
  path.startsWith('/pwa-icon/') ||
  path.startsWith('/pwa-splash/');

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC_CACHE, SHELL_CACHE]);
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n.startsWith('ef-') && !keep.has(n)).map((n) => caches.delete(n)),
      );
      // Starts the page request while the worker boots, so a cold launch
      // doesn't wait for one before the other.
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  // Sign-out: drop everything this worker keeps (useSignOut).
  if (event.data && event.data.type === 'PURGE') {
    event.waitUntil(
      caches
        .keys()
        .then((names) =>
          Promise.all(names.filter((n) => n.startsWith('ef-')).map((n) => caches.delete(n))),
        ),
    );
  }
});

async function trim(cache) {
  const keys = await cache.keys();
  const extra = keys.length - STATIC_MAX_ENTRIES;
  // Oldest first: keys() keeps insertion order.
  for (let i = 0; i < extra; i += 1) await cache.delete(keys[i]);
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok && response.type === 'basic') {
    await cache.put(request, response.clone());
    await trim(cache);
  }
  return response;
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(event.request);
  const refresh = fetch(event.request)
    .then(async (response) => {
      if (response.ok && response.type === 'basic')
        await cache.put(event.request, response.clone());
      return response;
    })
    .catch(() => undefined);
  if (hit) {
    event.waitUntil(refresh);
    return hit;
  }
  return (await refresh) || Response.error();
}

async function page(event) {
  try {
    const preloaded = await event.preloadResponse;
    if (preloaded) return preloaded;
    return await fetch(event.request);
  } catch {
    const offline = await caches.match(OFFLINE_URL);
    return offline || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never the API, in any form (it answers per person).
  if (url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(page(event));
    return;
  }
  if (isHashed(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (isStaticImage(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event));
  }
  // Everything else: the browser's own handling, untouched.
});
