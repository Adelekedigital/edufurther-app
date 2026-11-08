# 0011. A service worker that caches the app's code, never its pages or data

- Status: Accepted
- Date: 2026-11-07
- Deciders: owner (asked for the slow-launch fix, 2026-11-07); frontend
- Supersedes: —

## Context and problem statement

On iPhone, the installed app showed a black screen for 30 to 60 seconds when
it was opened after being closed for a while. Safari tabs opened quickly
(owner, 2026-11-01). Server timings were under 1.5 s. iOS discards an idle
home-screen app, so the next launch is a cold start with its own storage,
apart from Safari's. Every launch downloaded all of the app's code again,
because nothing was kept for it. The black is iOS's default launch screen
when no `apple-touch-startup-image` matches the device.

Our pages are drawn per person: the session hint and the role are in the
HTML. Our API answers per person, and in "Preview as user" the same URL
answers as someone else (`X-EF-Preview`). A cache that serves either could
show one person's page or data to another on a shared device.

## Considered options

1. **Cache the code, never pages or the API.** Pages are network-only with
   navigation preload, and a static offline page is shown when there is no
   network.
2. **Also cache pages** (network-first with a cached fallback, or
   stale-while-revalidate). This is faster offline, but a cached page belongs
   to the person it was drawn for, and stale-while-revalidate puts an old
   page against a new API.
3. **A framework plugin** (next-pwa, Serwist). It generates precache lists,
   but brings a build dependency and defaults that cache documents, which
   then have to be undone.

## Decision

Option 1, as a hand-written `public/sw.js`:

- `/_next/static/**` (code, styles, fonts; content-hashed) is cache-first.
  The newest 400 entries are kept, so old deploys don't pile up.
- `/brand/`, `/illustrations/`, `/pwa-icon/` and `/pwa-splash/` (fixed
  names) use stale-while-revalidate.
- Pages are network-only with navigation preload. Only when the network
  fails is the precached `public/offline.html` shown: static, and about no
  one.
- **Never handled:** `/api/*`, anything but GET, and other origins. These go
  straight to the network, untouched.
- **Updates:** `skipWaiting` plus `clients.claim`. This is safe here only
  because no page is served from the cache: a new worker can't put an old
  page against a new API, and the code an open page still asks for stays in
  the cache. If a later change caches pages, revisit this and move to
  "prompt to reload".
- **Registration:** `src/app/_shell/ServiceWorkerRegistration.tsx`, mounted
  in the root layout, after page load, production only. `/sw.js` and
  `/offline.html` are served `no-cache` (`PWA_HEADERS`).
- **Sign-out:** `useSignOut` clears every `ef-` cache. None holds personal
  data, but a shared device starts clean.
- **Off switch:** `NEXT_PUBLIC_SERVICE_WORKER=off`, then redeploy. Every
  visit unregisters the worker and clears its caches. This works because the
  worker never serves pages, so the page carrying the off switch always
  comes from the network.
- **iOS launch screens:** `src/app/pwa-splash/[size]`, the wordmark on white,
  one per iPhone size (`sizes.ts`). Built statically at build time
  (`force-static`), so no render is billed per launch. Android builds its
  own splash from the manifest's name, background colour and icon.

## Consequences

Good:

- A cold launch fetches only the page; the code comes from the device.
  Navigation preload starts the page request while the worker boots.
- iPhone shows the logo instead of black while the page loads.
- Nothing personal is ever cached, so there is no purge to get wrong and no
  cross-account leak. Preview as user is unaffected.
- Repeat asset traffic to Vercel drops.

Bad:

- Offline, the app shows "You're offline" rather than a last saved copy.
  There is no offline reading.
- The page itself still needs the network on launch. If a launch is slow for
  another reason (a hanging request), this does not fix it; Safari's Web
  Inspector on a Mac is the next tool.
- The splash list must be extended when Apple ships new screen sizes. An
  unmatched device falls back to black, as before.
- The placeholder icons (pwa-icon) still need the final brand icon.

## Evidence

- `public/sw.js`, `public/offline.html`
- `src/lib/utils/serviceWorker.ts` (registration, off switch, `clearAppCaches`)
- `src/app/_shell/ServiceWorkerRegistration.tsx`, `src/app/layout.tsx`
- `src/app/pwa-splash/`
- `src/lib/securityHeaders.ts` (`PWA_HEADERS`)
- `src/proxy.ts` (the matcher skips `pwa-splash/`)
- Tests: `src/lib/utils/sw.test.ts` runs the real `public/sw.js` in a fake
  worker scope; plus `serviceWorker.test.ts`, `pwa-splash/sizes.test.ts` and
  `proxy.matcher.test.ts`
