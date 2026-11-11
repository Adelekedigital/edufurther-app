# EduFurther app (frontend)

Next.js (App Router, TypeScript) frontend for EduFurther, an experience-led
mentorship platform for the study-abroad journey. Built from the design source at
claude.ai/design (`fb0b8ef2…`) against the backend in `edufurtherBE`.

## Run it

```bash
pnpm install --frozen-lockfile
# The API spec is not committed. Pull the backend's published spec, then
# generate the client:
pnpm spec:pull
pnpm gen:api
pnpm dev                 # http://localhost:3000/explore — uses the in-app mock API
pnpm test                # Vitest + Testing Library
pnpm storybook           # every component, every state, in isolation
node scripts/check-boundaries.mjs
node scripts/review-page.mjs /explore            # needs the app running
```

Against the real backend, in `.env.development.local`: `NEXT_PUBLIC_API_BASE_URL=` (empty,
so calls go same-origin), `BACKEND_URL=http://localhost:8000`, and `ENABLE_MOCK_API=`
(see `.env.example`).

Two things that break booking against a real backend (preview or dev):

- **`NEXT_PUBLIC_API_BASE_URL` must stay unset on Vercel.** Set, the browser calls the
  backend's domain directly. `POST /sessions` then fails CORS on its `Idempotency-Key`
  header, and the user sees "We couldn't reach EduFurther".
- **`NEXT_PUBLIC_MOCK_VIEWER` can't book.** It only fakes the viewer in the UI, with no
  sign-in and no token, so the backend answers `POST /sessions` with 401. Browse with it;
  sign in for real to book.

## Fonts and icons

Self-hosted, never fetched from Google at build or runtime (`src/app/fonts/`, loaded by
`next/font/local`). Text fonts are subsets from google/fonts (SIL OFL, licences alongside):
rebuild with `python scripts/fonts/build_fonts.py <sources>` (needs fonttools + brotli). The
icon font is a Material Symbols subset of `ICON_NAMES`: after adding an icon to
`src/components/atoms/Icon/iconNames.ts`, run `pnpm icons:pull` and commit the result
(CI's `pnpm check:icons` fails otherwise).

## Deploying (Vercel)

`vercel.json` sets the build command: `pnpm spec:pull && pnpm gen:api && pnpm build`.
The browser calls `/api/v1/…` on the app's own domain and `src/proxy.ts` forwards it to
`BACKEND_URL`, so preview URLs need no CORS entry on the backend. Every call the app makes
to the backend carries `X-EduFurther-Proxy-Secret` when `EDGE_PROXY_SECRET` is set (ADR 0003).

Sign-in also needs, in the Supabase dashboard (Authentication → URL Configuration), the
site URL and redirect URLs: `http://localhost:3000/**`, the production domain `/**`, and the
Vercel preview pattern `https://*-<team>.vercel.app/**`. The magic link lands on
`/auth/callback`.

| Env var | Production | Preview | Notes |
|---|---|---|---|
| `BACKEND_URL` | prod backend | `https://edufurtherbe-dev.up.railway.app` | server-only; the build fails without it on Vercel. Previews never use prod |
| `EDGE_PROXY_SECRET` | its own value | its own value | server-only, **never** `NEXT_PUBLIC_`. Must equal the backend's `EDGE_PROXY_SECRET` for that environment (`openssl rand -hex 32`; 32+ visible ASCII, no spaces, or the build fails). Unset sends nothing. Set it here **before** on the backend, or every app request is refused |
| `NEXT_PUBLIC_MATCH_CALL_URL` | Cal link | Cal link | empty hides "Find my mentor matches" |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | support address | support address | where every "Contact support" goes; empty or not a plain address uses support@edufurther.org. A change needs a redeploy |
| `NEXT_PUBLIC_SUPABASE_URL` | prod project URL | dev project URL | public; empty turns sign-in off |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | prod publishable key | dev publishable key | public by design |
| `NEXT_PUBLIC_API_BASE_URL` | *unset* | *unset* | unset = same-origin proxy |
| `ENABLE_MOCK_API` | **never** | **never** | mock is for local dev and CI only |
| `NEXT_PUBLIC_MOCK_VIEWER` | **never** | **never** | fakes the viewer with no sign-in and no token, so booking fails with 401 (see above). Local dev only |
| `NEXT_PUBLIC_SENTRY_ENABLED` | `true` for the trial | *unset* | error tracking (ADR 0012); unset or anything but `true` loads nothing |
| `NEXT_PUBLIC_POSTHOG_ERRORS_ENABLED` | `true` for the trial | *unset* | PostHog's exceptions beside Sentry (ADR 0012); needs analytics on too. Scrubbed as Sentry's are; the person's id only after Accept |
| `NEXT_PUBLIC_SENTRY_DSN` | the app project's DSN | *unset* | public by design (it only names the project); without it nothing loads |
| `NEXT_PUBLIC_ERRORS_ENVIRONMENT` | `production` live; `testing` on the testing site | *unset* | the testing site is a Vercel production deployment on test data, and the trial scores live traffic only |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | build only | *unset* | **never** `NEXT_PUBLIC_`. With Sentry on, the build uploads source maps and deletes them, so the site never serves them |
| `NEXT_PUBLIC_ONBOARDING_ENABLED` | `true` | `true` | mentee onboarding; read as `=== 'true'`, so unset is off and `/onboarding` is not found (`src/lib/config/auth.ts`) |
| `NEXT_PUBLIC_MENTOR_ONBOARDING_ENABLED` | `true` | `true` | mentor onboarding and `/mentor-application`; read as `=== 'true'`, so unset is off (`src/lib/config/auth.ts`) |
| `NEXT_PUBLIC_MESSAGES_ENABLED` | `true` | `true` | Messages, its nav item and every Message button; read as `=== 'true'`, so unset is off and `/messages` is not found (`src/lib/config/messages.ts`) |
| `PWA_SPLASH_SLOGAN` | *unset* | *unset* | `true` shows the slogan under the logo on the iPhone launch screen (12px, `--text-p-xs`); unset hides it. Read at build time, so a change needs a redeploy |
| `SITE_INDEXABLE` | `true`, once the site is meant to be indexed | *unset* | server-only; read as `=== 'true'` by `src/app/robots.ts`. Anything else keeps crawlers out |

## Where things are

| Path | What |
|---|---|
| `src/styles/tokens/` | Design-system tokens, verbatim with provenance; `ours.css` = tokens the design lacks |
| `src/components/{atoms,molecules,organisms,templates}` | Atomic levels; imports only point down |
| `src/lib/api/generated/` | Generated locally from the private `openapi/openapi.json` (`pnpm gen:api`); **never committed**. Imported only by `lib/api/data/` |
| `src/lib/api/data/` | Hooks, query keys, error normalisation, label rules — the seam |
| `src/app/(app)/` | Every signed-in screen, inside the one app shell (ADR 0007). Sign-in, onboarding and invites sit beside it in `src/app/`. Routes fetch only through `src/lib/api/data/` |
| `src/app/api/mock/` | Phase A mock of the backend contract (answers only with `ENABLE_MOCK_API=1`) |
| `docs/handoff/` | Requests to / replies from the backend and design — **local only, never committed** |
| `.claude/skills/project-conventions/` | Settled decisions, contract, divergences, failure log |

## Status

Every screen is built and wired to the real backend: sign-in, onboarding, Home for both
roles, Explore, mentor profiles, booking, bookings, session join, messages, settings,
mentor onboarding and the mentor application, calendar and integrations, admin, and
invites. The in-app mock (`ENABLE_MOCK_API=1`) stays for local dev and CI.

## Private files

This repo is public. `openapi/`, `src/lib/api/generated/` and `docs/handoff/` are
git-ignored and must never be committed; `pnpm check:private` (also run in CI)
fails if one is tracked. The spec is downloaded, never stored: `pnpm spec:pull` fetches
the backend's published `openapi.json` (release `openapi-latest` on `edufurtherbe`).
Nothing else is needed to build: no token, no extra Vercel variable beyond `BACKEND_URL`
(and `EDGE_PROXY_SECRET` once the backend's origin lock is on).
