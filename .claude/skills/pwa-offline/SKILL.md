---
name: pwa-offline
description: Service workers, caching strategies, install, and offline behaviour — scope and registration, the three update strategies and what each costs the user, what must never be cached, offline as a designed state rather than an error, queued writes carrying idempotency keys, and purging caches on logout. Use when adding or changing a service worker, adding install or offline support, choosing a caching strategy, debugging a stale asset or a stuck update, or when a reconnect replays a write twice.
---

# PWA and offline

A service worker is a proxy you ship to the user's device and cannot easily recall.
Everything here follows from that.

## Scope and registration

The worker controls pages **at or below its own path**. A worker at
`/static/sw.js` cannot control `/`. Serve it from the root.

```ts
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' });
  });
}
```

- Register **after** load. Registration competes with the first paint otherwise.
- Never in development — a stale worker serving yesterday's bundle is the single
  most confusing local bug in this area.
- The worker file itself must be served `Cache-Control: no-cache`, or you cannot
  ship a fix to the thing that ships fixes.
- Version your cache names (`app-v7`) and delete old ones in `activate`. Caches are
  not evicted for you, and quota exhaustion fails writes silently.

## The three update strategies

A new worker installs and then **waits** for every tab using the old one to close.
Users keep tabs open for weeks. Pick deliberately; each option costs the user
something different.

| Strategy | User experience | Cost | Use when |
|---|---|---|---|
| **Wait** (default) | new version appears eventually, maybe days later | a bug fix does not reach users you can identify | content sites; nothing coupled to an API |
| **Prompt** | "A new version is available — Reload" | one interruption; needs UI and copy | most apps. The honest default. |
| **`skipWaiting`** | reloads under the user | **can discard unsaved work and mismatch chunks mid-session** | only when nothing is in flight and you accept the risk |

```ts
// prompt — the recommended shape
const reg = await navigator.serviceWorker.register('/sw.js');
reg.addEventListener('updatefound', () => {
  reg.installing?.addEventListener('statechange', (e) => {
    if ((e.target as ServiceWorker).state === 'installed' && navigator.serviceWorker.controller) {
      showUpdateToast(() => {
        reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
      });
    }
  });
});
navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
```

`skipWaiting()` unconditionally in `install` is the most common mistake in this
area. It also breaks lazy chunks: the page holds references to hashed chunks the
new deploy no longer has, so a `dynamic()` import fails minutes later with an error
nobody can reproduce.

## Caching strategies

| Content | Strategy | Why |
|---|---|---|
| Hashed build assets (`/_next/static/**`) | cache-first, long TTL | the hash is the version |
| HTML documents | network-first, cache fallback | must not serve a stale shell against a new API |
| Fonts, icons | cache-first | immutable enough |
| API GETs, non-sensitive | stale-while-revalidate | fast, and self-correcting |
| Anything user-specific | network-only, or a private cache purged on logout | it is somebody's data |

`stale-while-revalidate` on a document is how a user ends up on last week's shell
calling this week's API.

## Never cache

- Any response to an authenticated request that you cannot purge on logout
- `Set-Cookie` responses, auth endpoints, token refresh
- Anything with `Cache-Control: no-store`
- POST/PUT/PATCH/DELETE responses
- Payment, health, or credential data — in any cache, at any TTL

**Purge on logout**, explicitly:

```ts
export async function purgeOnLogout() {
  const names = await caches.keys();
  await Promise.all(names.filter((n) => n.startsWith('user-')).map((n) => caches.delete(n)));
  await indexedDB.deleteDatabase('offline-writes');
  // tell the worker too — it may hold in-memory state
  navigator.serviceWorker.controller?.postMessage({ type: 'PURGE' });
}
```

A shared device is the normal case. See `security-checker` for what may be stored
at all.

## Offline is a designed state

Not an error. The fourth state of `ui-states` is *error*; offline is a fifth, and it
reads differently.

| Do | Don't |
|---|---|
| Say "You're offline — showing your last saved copy" | "Something went wrong" |
| Show when the data was last fetched | present stale data as live |
| Disable actions that genuinely cannot work, with a reason | let a button fail silently |
| Queue what can be queued, and say it is queued | pretend it succeeded |
| Recover automatically on reconnect, and say so | require a manual reload |

```tsx
const online = useOnline();               // navigator.onLine + online/offline events
return (
  <>
    {!online && (
      <div role="status">
        You're offline. Showing your last saved copy from {formatRelative(lastSyncedAt)}.
      </div>
    )}
    …
  </>
);
```

`navigator.onLine` only tells you the interface is up, not that your API is
reachable. Treat a failed request as the real signal and `onLine` as a hint.

An offline fallback page must be **precached at install**, or it is not there when
you need it.

## Queued writes

Any write made offline is replayed later. At-least-once delivery is the only
guarantee you get, so **every queued write carries an idempotency key** generated
at the moment the user acted — not at replay time.

```ts
type QueuedWrite = {
  id: string;                    // crypto.randomUUID() — the idempotency key
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body: unknown;
  createdAt: number;
  attempts: number;
};

async function replay(w: QueuedWrite) {
  const res = await fetch(w.url, {
    method: w.method,
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': w.id },
    body: JSON.stringify(w.body),
  });
  if (res.status === 409 || res.ok) return 'done';    // already applied, or applied now
  if (res.status >= 400 && res.status < 500) return 'drop';  // will never succeed
  throw new Error('retry');
}
```

Without the key, a reconnect that retries an unacknowledged request double-charges,
double-posts, or double-invites. The server must honour the key; if it does not,
that is a backend conversation to have **before** shipping offline writes.

Also:

- Queue in IndexedDB, not memory. The tab will close.
- Replay **in order** per resource, or a rename-then-delete arrives backwards.
- Cap attempts, then surface it. A write that can never succeed must become visible,
  not retry forever.
- Show the queue. "3 changes waiting to sync" is the difference between trust and a
  support ticket.
- Purge the queue on logout, and decide what happens to its contents — dropping a
  user's unsynced work silently is not acceptable; tell them.

Background Sync is a bonus where supported, never the only path.

## Install

- A manifest with name, icons (192 and 512, plus maskable), `start_url`, `display`,
  and theme colours.
- Do not prompt on first load. Prompt after the user has done the thing the app is
  for, and only once — store the dismissal.
- `start_url` should carry a source parameter so you can tell installed traffic
  apart in analytics.
- iOS still needs `apple-touch-icon` and has its own storage eviction behaviour.
  Test there specifically.

## Testing

- DevTools → Application → Service Workers: "Offline", "Update on reload",
  "Bypass for network".
- Test the **second** visit. Almost every service-worker bug only exists when a
  worker is already installed.
- Test the update path explicitly: deploy, keep the tab open, confirm the prompt
  appears and the reload lands on the new version.
- Test logout while offline with a non-empty queue.
- Have a kill switch: a worker that unregisters itself and clears caches, ready to
  deploy. When a bad worker ships, it is the only way out.

## Definition of done

- [ ] Worker served from root, `no-cache`, registered after load, production only
- [ ] Cache names versioned; old caches deleted in `activate`
- [ ] Update strategy chosen deliberately, and its cost written down
- [ ] No `skipWaiting()` without an explicit decision about in-flight work
- [ ] Documents network-first; hashed assets cache-first
- [ ] Nothing authenticated cached without a purge path
- [ ] Logout purges caches, IndexedDB, and the write queue
- [ ] Offline reads as offline, with a last-updated time — not as an error
- [ ] Offline fallback precached at install
- [ ] Every queued write carries an idempotency key made at action time
- [ ] Replay is ordered, capped, and visible to the user
- [ ] Tested on a second visit, and through one real update
