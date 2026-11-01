# 0003. The browser calls the API on our own origin, proxied by a Next rewrite

- Status: Accepted (recorded retroactively 2026-10-12); amended 2026-11-01 (origin lock)
- Date: 2026-09-27 (decision); 2026-10-12 (recorded)
- Deciders: product (owner)
- Supersedes: —

## Context and problem statement

The backend's CORS allow-list takes exact origins only. Every Vercel preview deployment
gets a new URL, so a browser calling the backend's domain directly would need a CORS entry
per preview. Booking also sends an `Idempotency-Key` header on `POST /sessions`, which
makes that request a CORS preflight. We needed deployed builds, previews included, to reach
the right backend without touching the backend's configuration per deploy.

## Considered options

1. **Same-origin proxy:** the browser calls `/api/v1/…` on the app, and Next rewrites it to
   a server-only `BACKEND_URL`.
2. **Direct calls** to the backend's domain via `NEXT_PUBLIC_API_BASE_URL`, with CORS
   entries maintained on the backend.

## Decision

Option 1 (product, 2026-09-27). `next.config.ts` reads `BACKEND_URL`, and `rewrites()` maps
`/api/v1/:path*` to `${BACKEND_URL}/api/v1/:path*`. The generated client
(`lib/api/data/http.ts`) uses `NEXT_PUBLIC_API_BASE_URL || ''` as its base, so with the
variable unset every call is same-origin.

- `BACKEND_URL` is server-only and never sent to the browser.
- Vercel production points at the production backend; previews point at
  `edufurtherbe-dev`, never production (README, Deploying).
- On Vercel (`VERCEL=1`) the build fails if `BACKEND_URL` is missing; it must be `https`,
  except `localhost` / `127.0.0.1`. Without it outside Vercel, no rewrite is added.
- `NEXT_PUBLIC_API_BASE_URL` stays unset on Vercel. Local dev sets it to `/api/mock`
  (ADR 0006); against a local backend it is empty and `BACKEND_URL=http://localhost:8000`.
- The proxy matcher in `src/proxy.ts` skips `api/`, so proxied calls don't pay for the
  session check (ADR 0004).

## Consequences

Good:

- No CORS entry per preview URL, and no preflight on the booking request.
- The backend's address is configuration on the server, not in the bundle.
- A missing or malformed `BACKEND_URL` fails the Vercel build instead of shipping a broken app.

Bad:

- Every API call goes through Vercel, adding a hop and counting against its usage.
- Setting `NEXT_PUBLIC_API_BASE_URL` on Vercel silently bypasses the proxy, and booking
  then fails CORS ("We couldn't reach EduFurther"). Only the README guards this.
- The server has no same origin to call, so the one server-side call (`/` reading `/me` to
  pick the viewer's home) goes to `BACKEND_URL` directly with its own client
  (`lib/api/data/home.ts`). Two paths to the backend, configured by the same variable.
- Outside Vercel a missing `BACKEND_URL` is not an error; it shows up as failed calls.

## Amendment, 2026-11-01: the origin lock (backend #426, decision 304)

The backend now refuses any `/api/` call without a matching `X-EduFurther-Proxy-Secret`
header while its `EDGE_PROXY_SECRET` is set, so the only way in is through this app. Never
locked: `/health`, `/ready`, and the machine callers under `/api/v1/callbacks/*` (the
Google Calendar OAuth redirect, which Google sends to the backend's own origin, ADR 0001)
and `/api/v1/internal/jobs/*`. The app sends the header on every call it makes to
`BACKEND_URL`:

- **The rewrite moved from `next.config.ts` to `src/proxy.ts`.** A config rewrite cannot
  add a request header; a proxy rewrite can (`NextResponse.rewrite(url, { request: { headers } })`).
  The matcher now includes `/api/v1/:path*` (pinned by `src/proxy.matcher.test.ts`); those
  go straight to the rewrite with no session check. A client's own value under that name
  is removed first. The cost: every API call now invokes the proxy function before it is
  forwarded, where the config rewrite was resolved by Vercel's router alone.
- **The server-side calls add it too:** `/me` in `home.ts`, and `/join` and `/door` in
  `sessionEnter.ts`, both now based on the same validated origin as the proxy
  (`backendOrigin()`). Never to the in-app mock.
- **`EDGE_PROXY_SECRET` is server-only** (never `NEXT_PUBLIC_`). Unset (local dev), no
  header is sent and nothing changes. `src/lib/backend.ts` holds both checks; a malformed
  value (under 32 visible ASCII characters) fails the build, as a bad `BACKEND_URL` does.
- **Not a route handler, and the body skips the proxy.** Forwarding through a handler
  would hide the backend origin, but it runs as a function, whose 4.5 MB request-body
  cap on Vercel would break the 5 MB uploads. The proxy is a function too: measured on
  production 2026-11-01, a 4.6 MB upload got `413 FUNCTION_PAYLOAD_TOO_LARGE` from
  Vercel while 4.4 MB reached the backend. So `vercel.json` sets
  `skipMiddlewareRequestBody: true`: the proxy gets headers only and Vercel sends the
  body straight to the rewrite target. The proxy must never read a request body
  (pinned by `src/lib/vercelConfig.test.ts`).
- **The backend's origin is no longer a secret, and never was.** Self-hosted Next
  answers a proxy rewrite with `x-middleware-rewrite: <destination>`. The repo is
  public and names the dev backend's URL. The lock, not obscurity, is the protection.
- **Rollout order matters:** the app ships first, then the secret on Vercel, then on the
  backend. Setting it on the backend first refuses every app request.

## Evidence

- `src/lib/backend.ts` (`backendOrigin()`, `proxySecret()`); `next.config.ts` (the build check)
- `src/proxy.ts` (`forwardToBackend`, `config.matcher`)
- `src/lib/api/data/http.ts` (`baseUrl`), `src/lib/api/data/home.ts` (`fetchHome`)
- `src/proxy.ts` (`config.matcher` excludes `api/`)
- `README.md` → Deploying (Vercel), the env table, and the two booking pitfalls
- `.env.development`, `.env.example`
- `.claude/skills/project-conventions/SKILL.md` → The contract → Deployed API calls, Local dev
- git: `feat(deploy): Vercel build and a same-origin API proxy` (2026-09-27)
