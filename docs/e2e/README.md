# E2E: the frontend's browser steps (guide for the E2E session)

**The scenarios live in the backend repo.** This file is the frontend half:
how to write and run the `kind: ui` steps against this app. Read this first,
then the backend's plan.

| What | Where |
|---|---|
| Scenarios (fill the `actions` / `expect` marked `TODO(frontend)`) | backend repo `docs/e2e/scenarios.yaml` |
| The shape of a step | backend repo `docs/e2e/scenario.schema.json` |
| QA plan: roles, entry and exit criteria, DoD, severity, defects | backend repo `docs/e2e/README.md` |
| YAML check (schema, routes, viewers, `after`, no secrets) | backend repo `tests/unit/test_e2e_scenarios.py`. Run it after every edit. |
| The team's human checklist (same ids) | https://claude.ai/artifact/UHnFMufd4mYK1KJaEbcRhy |

## Target (founder-confirmed)

| Part | Value |
|---|---|
| Frontend | https://edufurther-app.vercel.app (its Production deploy runs on **test data**) |
| Backend | `edufurtherbe-dev` (Railway `development`) |
| Supabase | `hitgxzhrimuhivlfamhj` (the dev project) |

Never run signed-in or writing steps against any other project. Production
smoke runs (`SMOKE-001`) are GET-only and signed out.

## Signing in an agent

Passwordless, so no password exists. The backend's **local** script prints a
one-time magic link for an allowlisted seed account. It refuses unless
`--env staging` and `E2E_ALLOW=1` are set, and the Supabase project matches
`E2E_SUPABASE_PROJECT`.

```
python scripts/e2e_session.py --env staging --run <tag> --account <ref> --link \
  --redirect "https://edufurther-app.vercel.app/auth/callback?next=/home"
```

It runs through `railway run` against Railway's **development** environment,
so it reads that environment's own variables: `SUPABASE_URL`, the Supabase
service-role key, `EDUFURTHER_ENVIRONMENT=staging` and `E2E_SUPABASE_PROJECT`
(`hitgxzhrimuhivlfamhj`). `E2E_ALLOW=1` is given on the command line for each
run, never stored. The machine running it needs the Railway CLI logged in
(`railway login`, done once by the founder) and linked to the backend project.

Open the printed link in Playwright. `/auth/callback` (`src/app/auth/callback/route.ts`)
sets the session cookies, then goes to `next`, sanitised by `safeReturnTo`.
Without `next` it lands on the login flow. Migrated-account and Google
sign-in are **`human_only`**.

## Writing a `ui` step

The fields agreed with the backend:

```yaml
- kind: ui
  id: book_ui
  viewer: mentee_with_credits      # a seed account ref, never credentials
  viewport: [390, 1440]            # run each width
  flags: []                        # NEXT_PUBLIC_* the step needs (see Flags)
  route: "/mentors/${mentor_listed.id}"
  actions:
    - {do: click, target: {role: button, name: "Book a session"}}
    - {do: click, target: {role: radio, name: "9:00 am"}}
    - {do: fill, target: {label: "What do you want to cover?"}, value: "Essay review"}
  expect:
    - {visible: {role: dialog, name: "Book a session"}}
    - {url: "/bookings"}
  screenshot: true
  a11y: true                       # axe on P0 screens
  after: create_slots              # an earlier step id (API or UI)
```

**Rules:**
- **Accessible role and name only, never CSS selectors.** The app is built so
  every control has one: the atoms label themselves, and the screen tests in
  `src/**/*.test.tsx` query the same way. To find a name, read the screen's
  test (`getByRole('button', { name: … })`) or its copy in `src/lib/copy/*.ts`.
  Copy changes there, so quote it from the file, not from memory.
- `do: wait` waits for a visible state, never a fixed time.
- One step is one screen's job. Interleave with API steps through `after`, e.g.
  the UI books, then the API asserts the credit spent.

## Routes (the real ones)

```
/  /login  /signup  /auth/callback  /onboarding  /onboarding/mentee  /onboarding/mentor
/home  /explore  /mentors/[handle]  /bookings  /sessions/[id]  /messages
/dashboard  /calendar  /session-types  /session-types/new  /session-types/[id]/edit
/integrations  /mentor-application  /settings  /settings/[tab]  /invite/[code]
/admin  /admin/mentors  /admin/credits  /admin/emails  /admin/emails/[key]  /admin/analytics
```

**Check the draft YAML against this list.** A few drafted routes don't exist:
- There is no `/sessions` list page. A mentor declines or accepts a request
  from **`/bookings`** (or the **`/dashboard`** pending card).
- There is no `/reviews` page. A review opens from the session (`/sessions/[id]`)
  or the booking row on `/bookings`.

## Facts about the app that steps depend on

- **Booking** is a modal (`BookingLauncher`), opened from Explore, a profile,
  Home, onboarding (guest) and rebook-after-review. A session type with
  questions adds a questions step; one without goes straight to the request.
- **Joining (BOOK-001) on Daily:** attendance comes from **Daily's webhook**, so
  the mentee and the mentor must each **actually enter the Daily room**, or
  settlement marks a no-show. Agent runs use Daily (`SETUP-001` sets it); humans
  also run BOOK-001 on Google Meet.
- **Signed out on a members-only page (since 12 Nov, FE #565):** the proxy
  answers with a **307 to `/login?next=<page>`** (the query kept) before
  anything is drawn, and after logging in the person lands back on the page.
  Open to guests: `/`, `/explore`, `/mentors/[handle]`, `/invite/[code]`,
  `/login`, `/signup`. An unknown path is still the **404** error page, never a
  login. A step that opens a members-only page signed out expects that redirect,
  not an in-page "Log in" box (that box is now only the fallback when the
  session check itself fails). LINK's "return after sign-in" is this redirect.
- **Error pages (FE #558):** a 404 and a 500 share one page (`Error 404` /
  `Error 500` above the title). A 500 quotes a support reference `EF-XXXXXX`
  only when error tracking sent the report. Try again reloads the route's data.
- **Admin Analytics** days follow the **viewer's account time zone** (else the
  device's), with UTC selectable beside Compare (`ANALYTICS-001`; FE #555).
  Monthly totals and alerts stay UTC. Admin and demo accounts are left out of
  every figure.
- **Preview as user** blocks writes in the browser and shows a banner (`PREVIEW-001`).
- **Analytics consent (`CONSENT-001`/`-002`):** the banner shows only when
  `NEXT_PUBLIC_ANALYTICS_ENABLED` and `NEXT_PUBLIC_CONSENT_BANNER_ENABLED` are on.
  Buttons are "Allow analytics" and "Decline". The Settings › Security switch
  withdraws. The cookie is `ef_consent=<version>.<1|0>.<unix ms>`.

## Working with the founder (founder, 2026-11-12)

Do everything an agent can do **without the founder first**: every scenario,
every `ui` step, every fix round. Batch what needs a person into **one
check-in**, at a time the founder chooses, and don't stop the run to wait.
Mark each such step `human_only` and list them in the run report, ready to do
in one sitting:

- Google sign-in, and Google consent for calendar or video connect (OAUTH);
- logging in with a migrated account;
- push notifications on a real phone (PUSH), and installing the app (PWA) on one;
- BOOK-001 on Google Meet (agents run it on Daily).

Secrets are never typed in chat or written in a step. The sign-in script reads
them from Railway (`railway run`); see "Signing in an agent".

## Flags (`NEXT_PUBLIC_*`, set on the Vercel deploy)

`NEXT_PUBLIC_ANALYTICS_ENABLED`, `NEXT_PUBLIC_CONSENT_BANNER_ENABLED`,
`NEXT_PUBLIC_ADMIN_ANALYTICS_ENABLED`, `NEXT_PUBLIC_MESSAGES_ENABLED`, and for
error tracking `NEXT_PUBLIC_SENTRY_ENABLED`, `NEXT_PUBLIC_POSTHOG_ERRORS_ENABLED`. A step that
needs one lists it in `flags`. The runner checks the deploy has it and skips
the step if not, reporting it as blocked.

## UI-only journeys (P1/P2 stubs: `steps: []`, yours to write)

| Stub | What it covers |
|---|---|
| GUEST | Book before sign-up (onboarding guest path), finish sign-up, the booking resumes |
| INVITE | Invite landing `/invite/[code]` → sign-up attributed as invite |
| LINK | Deep links from email and push (`/sessions/[id]/enter`, return after sign-in) |
| OAUTH | Calendar and video-provider connect (`/integrations`, `/calendar`). `human_only` where Google consent is needed. |
| PUSH | Push permission prompt and opening a notification |
| TZ | Times shown in the viewer's time zone (booking, sessions) |
| FILE | Private file upload and the viewer (intake answers, message files) |
| ERROR | Offline banner, 5xx with Try again |
| CONSENT-002 | Withdraw in Settings; no PostHog id left on the device |
| KEYBOARD | Keyboard-only booking on a P0 path (focus never lost) |
| PWA | Install, service-worker update, offline state |
| LANDING | Mentors never land on Explore (start URL `/`) |
| LAYOUT | 390px layout on P0 screens (no horizontal scroll) |

## Running locally (Windows)

- The repo's Playwright driver is `scripts/review-page.mjs` (screenshots, axe,
  vitals). There's no scenario runner yet; build it under `scripts/e2e/` if needed.
- **Git Bash rewrites leading-slash arguments** into Windows paths: prefix
  commands with `MSYS_NO_PATHCONV=1` (routes, `NEXT_PUBLIC_API_BASE_URL=/api/mock`).
- A local mock run needs no backend:
  `MSYS_NO_PATHCONV=1 ENABLE_MOCK_API=1 NEXT_PUBLIC_API_BASE_URL=/api/mock NEXT_PUBLIC_MOCK_VIEWER=mentee pnpm exec next dev -p 3150`.
  Real-data scenarios run against the target above only.
- Put screenshots in a scratch folder, never in the repo, and attach them to
  the run report.

## Defects

A GitHub issue labelled `e2e` and `e2e:<scenario id>`, with the step id, the
viewport, the screenshot, and expected versus actual. Severity follows the
backend README (P0 blocks launch).
