# 0004. Auth: Supabase sessions in cookies, checked by the proxy on every page

- Status: Accepted (recorded retroactively 2026-10-12)
- Date: 2026-09-27 (sign-in); 2026-09-30 (session hint); 2026-10-03 (Google); 2026-10-12 (recorded)
- Deciders: backend auth reply (2026-09-27); product (owner) for the hint trade-off
  (2026-09-30); user for Google (2026-10-03)
- Supersedes: —

## Context and problem statement

The backend authenticates with Supabase access tokens (`Authorization: Bearer`). The app
needs to sign people in, keep the session alive across visits, send the token on every API
call, and draw the right chrome (member sidebar or guest header) on the first paint rather
than swapping it after load (failure log #37). The vendor SDK must stay replaceable.

## Decision

- **Supabase, passwordless:** email code plus magic link (backend auth reply 2026-09-27),
  and Google via `signInWithOAuth` (2026-10-03). Both land on `/auth/callback`, where one
  PKCE exchange (`exchangeCodeForSession`) turns the code into a session cookie. No password.
- **One vendor seam:** only `src/lib/vendor/supabase/` imports `@supabase/ssr` or
  `@supabase/supabase-js`. `package.json` → `checkBoundaries.vendorSeams` enforces it.
- **Cookies, not localStorage:** the session lives in cookies via `@supabase/ssr`. Cookies
  are `Secure` in production (`COOKIE_OPTIONS`), since `@supabase/ssr` sets no flag itself.
- **The proxy checks the session on every page.** `src/proxy.ts` (Next 16's middleware)
  calls `refreshSessionCookies`, which verifies the JWT with `getClaims()`, refreshes an
  expiring one, and writes new cookies to both the request and the response. Its matcher
  skips `api/`, `_next/` and static files.
- **The render gets a hint, not authority.** The proxy sets `x-ef-session` to the verified
  user id or `none`, always replacing a client's value, and removes it when the check
  failed. The root layout seeds `useSession` with it. It decides which chrome to draw; data
  calls carry their own token.
- **Only `/` calls the API on the server.** The proxy passes the verified access token in
  `x-ef-access-token` for `/` alone (to pick the viewer's home), so the render never builds
  its own Supabase client that could rotate a refresh token it cannot save.
- **API calls:** `authMiddleware.ts` adds `Bearer <token>`, refreshes once on 401 and
  retries a pre-sent clone (so `POST /sessions` keeps its Idempotency-Key), else signs out.
- **No config, no auth:** with `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` unset, auth is off
  and the app runs as a guest, or as the mock viewer in dev (ADR 0006).

Rules built on this (viewer states from `/me`, `safeReturnTo`, the Google failure mapping)
are in `.claude/skills/project-conventions/references/auth.md`.

## Consequences

Good:
- First paint matches the visitor: no guest header flashing before the sidebar.
- A returning visitor's token is fresh before the page calls the API.
- Swapping auth vendors touches one directory.

Bad:
- **Every page renders per request.** Reading the hint in the root layout rules out static
  prerendering. Accepted by product (2026-09-30): pages fetch in the browser anyway and warm
  LCP matched `main`.
- Each page navigation pays for a Supabase claims check (and sometimes a refresh) in the proxy.
- The hint is only as current as the last navigation; a session ended in another tab is
  seen when the next call 401s.
- Paths the matcher skips (anything with a dot) can carry a client's own `x-ef-session`.
  It only changes that client's chrome, never data access.

## Evidence

- `src/proxy.ts`
- `src/lib/vendor/supabase/server.ts` (`refreshSessionCookies`, `exchangeCodeForSession`,
  `SESSION_HINT_HEADER`, `ACCESS_TOKEN_HEADER`)
- `src/lib/vendor/supabase/config.ts` (`authConfigured`, `COOKIE_OPTIONS`)
- `src/lib/vendor/supabase/browser.ts` (`signInWithGoogle`, `verifyEmailCode`, `signOut`)
- `src/lib/api/data/authMiddleware.ts`, `src/lib/api/data/http.ts`
- `src/app/layout.tsx` (reads `SESSION_HINT_HEADER`)
- `package.json` → `checkBoundaries.vendorSeams`
- `.claude/skills/project-conventions/references/auth.md`
- git: `feat(auth): passwordless sign-in, the real viewer and the account menu (B1)`
  (2026-09-27); `fix(shell): the first paint has the right chrome…` (2026-09-30)
