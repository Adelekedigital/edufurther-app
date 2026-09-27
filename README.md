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

## Fonts and icons

Self-hosted, never fetched from Google at build or runtime (`src/app/fonts/`, loaded by
`next/font/local`). Text fonts are subsets from google/fonts (SIL OFL, licences alongside):
rebuild with `python scripts/fonts/build_fonts.py <sources>` (needs fonttools + brotli). The
icon font is a Material Symbols subset of `ICON_NAMES`: after adding an icon to
`src/components/atoms/Icon/iconNames.ts`, run `pnpm icons:pull` and commit the result
(CI's `pnpm check:icons` fails otherwise).

## Deploying (Vercel)

`vercel.json` sets the build command: `pnpm spec:pull && pnpm gen:api && pnpm build`.
The browser calls `/api/v1/…` on the app's own domain and `next.config.ts` proxies it to
`BACKEND_URL`, so preview URLs need no CORS entry on the backend.

Sign-in also needs, in the Supabase dashboard (Authentication → URL Configuration), the
site URL and redirect URLs: `http://localhost:3000/**`, the production domain `/**`, and the
Vercel preview pattern `https://*-<team>.vercel.app/**`. The magic link lands on
`/auth/callback`.

| Env var | Production | Preview | Notes |
|---|---|---|---|
| `BACKEND_URL` | prod backend | `https://edufurtherbe-dev.up.railway.app` | server-only; the build fails without it on Vercel. Previews never use prod |
| `NEXT_PUBLIC_MATCH_CALL_URL` | Cal link | Cal link | empty hides "Find my mentor matches" |
| `NEXT_PUBLIC_SUPABASE_URL` | prod project URL | dev project URL | public; empty turns sign-in off |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | prod publishable key | dev publishable key | public by design |
| `NEXT_PUBLIC_API_BASE_URL` | *unset* | *unset* | unset = same-origin proxy |
| `ENABLE_MOCK_API` | **never** | **never** | mock is for local dev and CI only |

## Where things are

| Path | What |
|---|---|
| `src/styles/tokens/` | Design-system tokens, verbatim with provenance; `ours.css` = tokens the design lacks |
| `src/components/{atoms,molecules,organisms,templates}` | Atomic levels; imports only point down |
| `src/lib/api/generated/` | Generated locally from the private `openapi/openapi.json` (`pnpm gen:api`); **never committed**. Imported only by `lib/api/data/` |
| `src/lib/api/data/` | Hooks, query keys, error normalisation, label rules — the seam |
| `src/app/explore/` | The Explore screen — the only place that fetches |
| `src/app/api/mock/` | Phase A mock of the backend contract (answers only with `ENABLE_MOCK_API=1`) |
| `docs/handoff/` | Requests to / replies from the backend and design — **local only, never committed** |
| `.claude/skills/project-conventions/` | Settled decisions, contract, divergences, failure log |

## Status

Explore phase A: the list with every state, and the booking flow on mocked
slots. Phase B wires auth and the real booking endpoints.

## Private files

This repo is public. `openapi/`, `src/lib/api/generated/` and `docs/handoff/` are
git-ignored and must never be committed; `pnpm check:private` (also run in CI)
fails if one is tracked. The spec is downloaded, never stored: `pnpm spec:pull` fetches
the backend's published `openapi.json` (release `openapi-latest` on `edufurtherbe`).
Nothing else is needed to build: no secret, no token, no extra Vercel variable
beyond `BACKEND_URL`.
