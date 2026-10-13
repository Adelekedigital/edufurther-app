# 0005. Data stack: a generated openapi-fetch client behind TanStack Query hooks; only pages fetch

- Status: Accepted (recorded retroactively 2026-10-12)
- Date: 2026-09-26 (project standards imported); 2026-09-27 (spec source); 2026-10-12 (recorded)
- Deciders: project standards (`CLAUDE.md` non-negotiable 2); product (owner) for where the
  spec comes from and building ahead of the backend (2026-09-27)
- Supersedes: —

## Context and problem statement

The backend publishes an OpenAPI spec and treats it as the contract. The frontend needs typed
calls that break at compile time when the contract changes, one place to handle auth and
errors, caching that knows signed-in lists differ from guest lists, and components that
render in isolation (Storybook, tests) without a network. The repo is public, so the spec
and generated code must not be committed.

## Decision

- **Generated types, thin client.** `pnpm spec:pull` downloads `openapi.json` from the
  backend's `openapi-latest` release; `pnpm gen:api` runs `openapi-typescript` into
  `src/lib/api/generated/schema.ts`. Both are git-ignored and `pnpm check:private` fails CI
  if one is tracked. The browser's `openapi-fetch` client is created once, in
  `src/lib/api/data/http.ts`, with the auth middleware (ADR 0004). The one server-side call
  (`/` picking the viewer's home) has its own instance in `lib/api/data/home.ts`, still inside the seam.
- **One seam.** `src/lib/api/data/` is the only importer of the generated client. It
  exports one hook per resource and shape (`useX`), built on TanStack Query, with every
  query key in `keys.ts`. Keys carry the session identity where signed-in results differ.
  The `QueryClient` lives in `src/app/providers.tsx` (`refetchOnWindowFocus: true`, `retry: 1`).
- **Only pages fetch.** Routes in `src/app/` call the hooks and pass data down as props.
  Atoms, molecules, organisms and templates never import the generated client
  (`CLAUDE.md` non-negotiable 2; `scripts/check-boundaries.mjs` rule 1, `clientModules:
  ["lib/api/generated"]`). They may import *types* from `lib/api/data`.
- **The typed client knows only what has shipped** (product 2026-09-27). An endpoint or field
  not yet in the published spec lives in the mock, marked `PENDING BACKEND` (ADR 0006), and
  is wired to the generated client when it ships.

## Consequences

Good:
- A contract change surfaces as type errors in one directory, not across components.
- Components render in isolation from props, which keeps Storybook and unit tests network-free.
- Auth, error mapping (RFC 9457 → our copy) and cache invalidation live in one place.

Bad:
- A build needs the published spec first (`spec:pull` then `gen:api`, in CI and in
  `vercel.json`); a fresh clone can't type-check until it has pulled.
- Pages carry all the fetching and become the heaviest files; several are near the
  1000-line limit (see project-conventions, file size).
- Work ahead of the backend is untyped until the endpoint ships, so the mock and the real
  contract can drift.
- The boundary checker only sees imports that resolve through the configured alias; a
  different import path would slip past it.

## Evidence

- `src/lib/api/data/http.ts`, `src/lib/api/data/keys.ts`, `src/lib/api/data/*.ts`
- `src/app/providers.tsx`
- `package.json` (`gen:api`, `spec:pull`, `checkBoundaries`, `@tanstack/react-query`,
  `openapi-fetch`, `openapi-typescript`)
- `scripts/check-boundaries.mjs` (rule 1), `scripts/pull-spec.mjs`, `scripts/check-private-paths.mjs`
- `CLAUDE.md` → Non-negotiables 2, Layout
- `.claude/skills/project-conventions/SKILL.md` → The contract
