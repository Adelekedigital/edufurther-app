/*
 * EduFurther service worker (ADR 0011), served at /sw.js by src/app/sw.js,
 * which fills in BUILD with the deploy's id. Its first job: make a cold launch
 * of the installed app fast by keeping the app's code on the device, so
 * nothing but the page itself has to come over the network.
 *
 * It also shows push notifications (the end of this file).
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
 * Every deploy is a new worker with new cache names, and activate drops the
 * old ones: nothing written to a cache outlives a deploy.
 *
 * Updates: skipWaiting + clients.claim. Safe here because no page comes from
 * the cache, so a new worker can't put an old page against a new API. An open
 * old page keeps the code it already ran; a chunk it has never loaded is
 * fetched from the network, as without a worker.
 */

const BUILD = '__BUILD__';
const CODE_CACHE = `ef-code-${BUILD}`;
const IMAGE_CACHE = `ef-images-${BUILD}`;
const SHELL_CACHE = `ef-shell-${BUILD}`;
const OFFLINE_URL = '/offline.html';
/** A deploy's code is a few hundred files; this only caps a runaway. */
const CODE_MAX_ENTRIES = 600;
const IMAGE_MAX_ENTRIES = 100;

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
      // Without the offline page the worker still speeds launches: install anyway.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([CODE_CACHE, IMAGE_CACHE, SHELL_CACHE]);
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

async function trim(cache, max) {
  const keys = await cache.keys();
  // Oldest first: keys() keeps insertion order.
  for (let i = 0; i < keys.length - max; i += 1) await cache.delete(keys[i]);
}

const keepable = (response) => response.ok && response.type === 'basic';

async function cacheFirst(request) {
  const cache = await caches.open(CODE_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (keepable(response)) {
    await cache.put(request, response.clone());
    await trim(cache, CODE_MAX_ENTRIES);
  }
  return response;
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(IMAGE_CACHE);
  const hit = await cache.match(event.request);
  const refresh = fetch(event.request)
    .then(async (response) => {
      if (keepable(response)) {
        await cache.put(event.request, response.clone());
        await trim(cache, IMAGE_MAX_ENTRIES);
      }
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

/*
 * Push notifications (decision 312). The server sends
 * { type, title, body, url, tag, badge }:
 * - the lock screen shows only who and what ("New message from Ada"), never
 *   message text: the server writes it that way;
 * - `tag` replaces an earlier notification about the same chat or session;
 * - `badge` is the receiver's unread messages count, for the app icon;
 * - `url` is opened as sent, but only ever inside this app (a path on this
 *   origin): anything else opens Home.
 */

const FALLBACK = { title: 'EduFurther', body: 'You have a new update.' };

function readPush(event) {
  try {
    const data = event.data ? event.data.json() : null;
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

/*
 * The app's one link check (lib/pwa/safePath.js), put here as it is by /sw.js
 * (app/sw.js/route.ts): one implementation, so a notification's link obeys
 * exactly the rules every other link does.
 */
const safeReturnTo = __SAFE_RETURN_TO__;

/** A path on this origin, or Home. Never another site. */
function inAppUrl(raw) {
  return typeof raw === 'string' ? safeReturnTo(raw, '/') : '/';
}

function setBadge(count) {
  const nav = self.navigator;
  if (typeof count !== 'number' || !Number.isFinite(count)) return undefined;
  if (count > 0 && nav.setAppBadge) return nav.setAppBadge(Math.floor(count)).catch(() => {});
  if (count <= 0 && nav.clearAppBadge) return nav.clearAppBadge().catch(() => {});
  return undefined;
}

self.addEventListener('push', (event) => {
  const data = readPush(event);
  const title = typeof data.title === 'string' && data.title ? data.title : FALLBACK.title;
  const body = typeof data.body === 'string' ? data.body : FALLBACK.body;
  const options = {
    body,
    icon: '/pwa-icon/192',
    data: { url: inAppUrl(data.url) },
  };
  if (typeof data.tag === 'string' && data.tag) {
    options.tag = data.tag;
    // The same chat again: tell them again, not silently.
    options.renotify = true;
  }
  // Every push shows a notification (userVisibleOnly): browsers penalise a silent one.
  event.waitUntil(
    Promise.all([self.registration.showNotification(title, options), setBadge(data.badge)]),
  );
});

/*
 * A tap opens the notification's screen. An open window of the app is asked
 * to go there itself (OPEN_MESSAGE, answered by lib/utils/serviceWorker
 * listenForOpenRequests): the app moves with its own router, which works on
 * iOS, where WindowClient.navigate() alone left the app on its last screen.
 *
 * Browsers let a tap focus or open a window only briefly (about a second), so:
 * one window only, a short wait (ACK_MS), and with no window, or one that isn't
 * this worker's, a new window at once. No answer from a window this worker
 * controls: navigate() it; failing that, a new window.
 */
const OPEN_MESSAGE = 'ef-open';
const ACK_MS = 700;

/** Asks a window to show `path`; true once it says it has, false after ACK_MS. */
function askToOpen(client, path) {
  return new Promise((resolve) => {
    let channel;
    let timer;
    const settle = (opened) => {
      clearTimeout(timer);
      if (channel) channel.port1.close();
      resolve(opened);
    };
    try {
      channel = new MessageChannel();
      channel.port1.onmessage = () => settle(true);
      timer = setTimeout(() => settle(false), ACK_MS);
      client.postMessage({ type: OPEN_MESSAGE, url: path }, [channel.port2]);
    } catch {
      settle(false);
    }
  });
}

/** The app's window to use: one this worker controls first, any of the app's next. */
async function appWindow() {
  const sameOrigin = (c) => new URL(c.url).origin === self.location.origin;
  const controlled = (await self.clients.matchAll({ type: 'window' })).filter(sameOrigin);
  if (controlled.length) return { client: controlled[0], controlled: true };
  const any = (await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).filter(
    sameOrigin,
  );
  return any.length ? { client: any[0], controlled: false } : null;
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = inAppUrl(event.notification.data && event.notification.data.url);
  event.waitUntil(
    (async () => {
      const target = new URL(path, self.location.origin).href;
      const found = await appWindow();
      if (found && found.controlled) {
        try {
          const focused = (await found.client.focus()) || found.client;
          if (await askToOpen(focused, path)) return;
          if (focused.navigate) {
            await focused.navigate(target);
            return;
          }
        } catch {
          // Gone, or can't be moved: a new window below.
        }
      }
      // No window, or one this worker can't move: a new one, while the tap still allows it.
      await self.clients.openWindow(target);
    })(),
  );
});
