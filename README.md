# EduFurther app (frontend)

Next.js (App Router, TypeScript) frontend for EduFurther, an experience-led
mentorship platform for the study-abroad journey. Built from the design source at
claude.ai/design (`fb0b8ef2…`) against the backend in `edufurtherBE`.

## Run it

```bash
pnpm install --frozen-lockfile
pnpm dev                 # http://localhost:3000/explore — uses the in-app mock API
pnpm test                # Vitest + Testing Library
pnpm storybook           # every component, every state, in isolation
node scripts/check-boundaries.mjs
node scripts/review-page.mjs /explore            # needs the app running
```

Against the real backend: set `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` and
unset `ENABLE_MOCK_API` (see `.env.example`).

## Where things are

| Path | What |
|---|---|
| `src/styles/tokens/` | Design-system tokens, verbatim with provenance; `ours.css` = tokens the design lacks |
| `src/components/{atoms,molecules,organisms,templates}` | Atomic levels; imports only point down |
| `src/lib/api/generated/` | Generated from `openapi/openapi.json` (`pnpm gen:api`). Imported only by `lib/api/data/` |
| `src/lib/api/data/` | Hooks, query keys, error normalisation, label rules — the seam |
| `src/app/explore/` | The Explore screen — the only place that fetches |
| `src/app/api/mock/` | Phase A mock of the backend contract (answers only with `ENABLE_MOCK_API=1`) |
| `docs/handoff/` | Requests to / replies from the backend and design |
| `.claude/skills/project-conventions/` | Settled decisions, contract, divergences, failure log |

## Status

Explore phase A: the list with every state, and the booking flow on mocked
slots. Phase B wires auth and the real booking endpoints.
