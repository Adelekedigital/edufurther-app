# 0006. An in-app mock of the API for local dev and CI page review

- Status: Accepted (recorded retroactively 2026-10-12)
- Date: 2026-09-26 (Explore phase A); 2026-09-27 (building ahead of the backend); 2026-10-12 (recorded)
- Deciders: user (Explore phase A, 2026-09-26); product (owner) for building ahead of the
  backend (2026-09-27)
- Supersedes: —

## Context and problem statement

Screens were built before, or alongside, the backend endpoints they use. CI's page review
(`scripts/review-page.mjs`) drives a built app in a browser and has no backend to call. Local
dev should not need the backend running or a real sign-in to see a screen as a mentee, a
mentor or a guest.

## Decision

- **Mock route handlers in the app.** `src/app/api/mock/api/v1/…` mirrors the backend's
  paths (57 `route.ts` files today, plus mock avatar, banner and photo routes), following the contract as the backend stated it.
  Fixtures and in-memory stores live in `src/lib/api/mock/`. Both import only generated
  *types*.
- **Off unless asked for.** Every handler answers `404` unless `ENABLE_MOCK_API=1`. It is set
  in `.env.development` and in CI, and never on Vercel (README env table).
- **Pointed at by the base URL.** `NEXT_PUBLIC_API_BASE_URL=/api/mock` sends the generated
  client to the mock; unset, calls go to the same-origin proxy (ADR 0003).
- **A fake viewer.** `NEXT_PUBLIC_MOCK_VIEWER` (`mentee` or `guest` in `.env.development`;
  `viewer.ts` also knows `mentor`, and `home.ts` `admin` for routing checks) replaces
  sign-in in the UI. Mentor-only routes (`/session-types`) default to the mentor, and
  `?mockViewer=` overrides it for manual checks. Unset on every real deploy.
- **CI reviews pages against the mock.** The `page-review` job builds with
  `NEXT_PUBLIC_API_BASE_URL=/api/mock` and `NEXT_PUBLIC_MOCK_VIEWER=mentee`, starts with
  `ENABLE_MOCK_API=1`, and runs `review-page.mjs` on a fixed route list, then `check-layout.mjs`.
- **Ahead of the backend.** An endpoint or field not yet in the published spec is mocked and
  marked `PENDING BACKEND` (ADR 0005).

## Consequences

Good:
- Screens can be built and reviewed before their endpoints exist.
- CI measures a built app deterministically, with no backend, secrets or network.
- Any role can be checked locally without an account.

Bad:
- The mock is hand-written and can drift from the real contract; a green page review says
  nothing about the real backend or environment (see project-conventions,
  `references/environments.md`).
- The mock ships in the production bundle as route handlers, disabled only by an env check.
  Setting `ENABLE_MOCK_API` on a deployment would serve fake data.
- The mock viewer has no token, so anything that needs the real backend (booking) fails
  with 401 under it (README).
- CI reviews only the routes listed in the workflow; an unlisted route is unmeasured.

## Evidence

- `src/app/api/mock/` (handlers, each gated on `ENABLE_MOCK_API`), `src/lib/api/mock/`
- `src/lib/api/data/viewer.ts` (`MOCK_VIEWERS`, `useMockViewer`, `MENTOR_ONLY_ROUTES`),
  `src/lib/api/data/home.ts`
- `src/lib/api/data/http.ts` (`baseUrl`)
- `.env.development`, `.env.example`
- `.github/workflows/ci.yml` → page-review job
- `README.md` (local dev against a real backend, the env table, "`NEXT_PUBLIC_MOCK_VIEWER` can't book")
- git: `feat(explore): mentor search with booking flow, phase A` (2026-09-26)
