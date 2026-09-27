---
name: project-conventions
description: This project's own settled decisions, house conventions, product rules, domain vocabulary, the API contract, and design provenance — the things that are true here and nowhere else. Use at the start of any build in this repository, when choosing between two valid approaches, when a generic standard seems to conflict with how this codebase does it, before proposing a pattern the codebase has not used before, or when a requirement uses a term with a project-specific meaning.
---

# Project conventions

> **This file is tier 2 — yours.** Updates to the standards package never
> overwrite it. Everything true only in this project belongs here, never in a
> generic skill.

## How to use this file

Read it first, before `build-workflow`. When a generic skill and this file
disagree, **this file wins** — and if it wins for a bad reason, fix this file
rather than quietly ignoring it.

Sources, so the next sync can diff against them: the design project's
`Design decisions.md`, `HANDOFF_PLAN.md`, `CLAUDE.md` (= handoff
`PROJECT_RULES.md`) and handoff `README.md`; the backend's ADRs in
`c:/pythonwork/edufurtherBE/docs/adr/`. Imported 2026-09-26.

---

## Settled decisions

| Decision | Reason | Would reopen if |
|---|---|---|
| Next.js App Router, React, TypeScript | Handoff target (`HANDOFF_PLAN.md`) | — |
| Build order: DS tokens → DS atoms → shared components → screens | Handoff README §1; `design-sync` | — |
| Build the **chosen default** of every design tweak; alternatives are "to test" and not built unless product asks | Handoff README §9 | product requests an A/B |
| One screen per session. This repo's sessions coordinate with the backend session by written handoff requests | User instruction, 2026-09-26 | — |
| Tokens are imported verbatim from the DS bundle into `src/styles/tokens/`, upstream name kept in a comment | `design-sync` provenance | DS renames tokens |
| Primary is `--blue-500 #0064ff`. Legacy `--brand-*` (#105192) and the orange ramp are **banned** in product UI | DS readme; handoff README §6 | never |
| Fonts via `next/font/google`: Hanken Grotesk (brand), Inter (UI), Poppins (DS button face), Nunito Sans (stands in for Avenir), Material Symbols Outlined (icons) | Handoff README §6 | licensed Avenir supplied |
| In-app CTAs use `Button size="sm"` **compact**: Inter semibold 12/16px, 32px tall, padding 0 16px; ≥44px on mobile. Built as a `compact` variant, not a style override | Design decisions + handoff §7.1 | DS adds a compact size |
| Mobile rules (44px targets, 16px inputs, full-screen modals, tighter padding, H3/H4→H6) are **per-component responsive CSS at 768px**, not a global `body[data-ef-mobile]` override | Handoff §7.3 explicitly asks for this | — |
| Every app screen renders inside `AppShell`; nav is never redrawn per screen | Design `CLAUDE.md` | — |
| Empty states are a vertical, centred DS `EmptyState` with the illustration that matches the state | Design `CLAUDE.md` | — |
| Every destructive action confirms in a `Modal tone="danger"` | Design `CLAUDE.md`, Round 7 | — |
| Explore hero, mentee and guest alike: "Find a mentor for your study-abroad journey" / "Get guidance from students and professionals who have been through the process. Explore free mentorship or book a paid 1:1 session." | Product, 2026-09-26. The design's mentee copy claimed match ranking, which isn't built | match ranking ships |
| The Explore session owns the foundation: scaffold, tokens, DS atoms, AppShell. Other screens reuse it | User, 2026-09-26 | — |
| Explore ships in two phases: A = list + BookingModal on mocked slots; B = real booking endpoints | User, 2026-09-26 | — |
| One booking flow, `BookingModal`, shared by Explore and Mentor Profile. Default `flow=timeFirst`, `signupAt=afterTime`, `payment=placeholder` | Design decisions: Explore | — |

---

## Product rules

- **Positioning: EduFurther is an experience-led mentorship platform.** Copy is actionable and encouraging, and never claims a capability that isn't built (e.g. match ranking).
- Undesigned states and copy are **held and sent to design** (`docs/handoff/*-design-request.md`), not invented in the build. Interaction states (focus, hover, pressed, disabled, reduced motion) are the exception: the build adds them as *ours*.
- A mentor with **no reviews never shows a star rating**. Show "New to EduFurther · No sessions yet / 1 session / N sessions". An empty rating reads as a bad one.
- Times are shown in the **viewer's timezone, with the zone named** ("Times shown in Lagos (WAT) ✎"), via `TimezonePicker`.
- Guests never see a match score. Guests sign up **after** choosing a time (`signupAt=afterTime`), and the chosen time is held for 10 minutes.
- A failed load **keeps the user's filters and query**.
- Free vs paid is stated before commitment: "Free mentorship available" or "Paid sessions from $X".
- Paid sessions: the mentee is not charged until the mentor confirms.
- Sentence case everywhere. US spelling. No emoji. "Mentor", never "Coach".
- Review attribution is first name + initial; the surname is never shown (backend guarantees it).

---

## Domain vocabulary

| Term | Means here | Does not mean |
|---|---|---|
| Mentor | Someone who has completed the path and takes bookings | a coach, a tutor |
| Mentee | The person booking | a student account in general |
| Guest | Signed-out visitor; sees the public header, no nav rail | a mentee |
| Offering / topic | One of the **six** closed platform help categories (School selection, Visa and interview, Program selection, Application documents, Career guidance, Scholarships & funding). What Explore's chips filter on and matching runs on. Backend: `offerings[]` `{slug, display_name}` | a session type |
| Session type | A bookable product a mentor defines: name, price (0 = free), duration, questions | an offering; a browser session |
| Session | A booked 1:1 | a browser/auth session |
| Booking | The request/record of a session: pending → confirmed / declined / cancelled / completed | — |
| Slot | A concrete start time a session type can be booked at | a weekly availability window |
| Rising mentor | Label for a new mentor (0–2 sessions, no reviews) | — |
| Plus | Premium mentor tag (gold, dark text) | a paid plan for mentees |
| Match | % fit to the mentee's onboarding goals. **Not built** (tweak `matchScore=hide` is the default) | a search relevance score |

---

## The contract

| Question | Answer |
|---|---|
| Handoffs | `docs/handoff/<screen>-backend-request.md` → backend session answers in `<screen>-backend-reply.md` (it writes there directly) |
| Where is the spec? | Backend FastAPI OpenAPI at `/openapi.json` (repo `c:/pythonwork/edufurtherBE`). `/docs` is the contract (backend ADR 0016 §4) |
| How is the client generated? | `openapi-typescript` → `src/lib/api/generated/schema.ts` from the checked-in `openapi/openapi.json` (`pnpm gen:api`); `openapi-fetch` client created once in `lib/api/data/http.ts`. The snapshot is **provisional** until the backend exports one — read its header for the swap rule (fields ahead of the backend stay until confirmed) |
| Where does the generated client live? | `src/lib/api/generated/` — imported only by `src/lib/api/data/` |
| Base path | `/api/v1/...` |
| Response envelope | Lists: `{ data: [...], next_cursor: string \| null }` |
| Error envelope | RFC 9457 Problem Details, `application/problem+json`: `{type, title, status, detail}`. **`detail` is not assumed safe to show**; map by `status` to our own copy. 401 carries no detail; 500 detail is withheld |
| Error codes that need specific UI | `422` on a list = bad cursor → restart from page 1. `404` on `/mentors/{handle}` = not found / not public (indistinguishable on purpose). Booking conflicts: see backend ADR 0024 — to confirm |
| Pagination style | Opaque cursor, `?cursor=&limit=` (default 10, max 50; Explore uses 10 — product, 2026-09-27). `total` on the first page only (coming) |
| Explore filters | `?offering=<slug>` repeatable, **ANY-of**, narrowed by `q`; slugs are the catalog `code` from `/api/v1/catalog/service-offerings`. Unknown slug → 422 |
| Local dev | Phase A: `.env.development` points at the in-app mock (`/api/mock`, `ENABLE_MOCK_API=1`). Real backend: `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` |
| Auth | Supabase auth (backend ADRs 0009, 0014, 0018). Public mentor endpoints need no token. Token storage on the client — to decide under `security-checker` |
| Idempotency | Booking is idempotent and scoped to the caller (backend ADR 0024) — key format to confirm before BookingModal is wired |

---

## Design source

| Question | Answer |
|---|---|
| Where is the design? | https://claude.ai/design/p/fb0b8ef2-d0b9-4366-b6ab-33f22c441cd8 (DS project `c4e21801-7d61-406c-9736-fe03d681ec21`) |
| Which parts are ported? | Explore (`/explore`) phase A: tokens, atoms, AppShell, ModalShell, MentorCard, MentorResults, BookingFlow (mocked slots) |
| Where do tokens come from? | `_ds/edufurther-design-system-…/tokens/*.css` → `src/styles/tokens/` |
| Where is divergence recorded? | `references/design-divergence.md` |
| What is deliberately not from the design? | Focus rings, disabled/busy, skeleton colour, reduced-motion, a text-on-photo scrim token — listed as *ours* in `design-divergence.md` |

Prototype files (`support.js`, `image-slot.js`, `dc-import`, `sc-if`) are the prototype runtime. **Never port them.**

---

## House conventions

- Route folders kebab-case; components PascalCase.
- Route-local components live in `src/app/<route>/_components/` until a second route needs them.
- DS atoms keep the DS names and props (`Button`, `Chip`, `EmptyState`, `Avatar`, `Badge`, …).
- `src/lib/api/data/` exports one hook per resource-and-shape, named `useX`.
- Tokens are referenced semantically where an alias exists (`--text-secondary`), by ramp otherwise (`--ink-700`). Never by value.

---

## Guardrails

| Never | Because |
|---|---|
| Use `--brand-*` or `--orange-*` in product UI | superseded palettes (DS readme) |
| Put white text on the Plus gold | ~2:1 contrast; use `#3d2a00` via a token |
| Show "★ 0 (0 reviews)" | reads as a bad rating |
| Port the prototype's global mobile `<style>` block | handoff §7.3; it overrides by attribute-substring selectors |
| Fetch below the page | `check-boundaries.mjs` rule 1 |
| Make this repo public while it holds `openapi/`, `docs/handoff/` or `.claude/` internals | they map the backend API and its behaviour; product chose a private repo (2026-09-26) |
| Push straight to `main` | every change goes through a PR with green CI, `/code-review` and `/security-review` (2026-09-26) |

---

## Known rough edges

| Where | What is wrong | Plan |
|---|---|---|
| Links to unbuilt screens | `prefetch={false}` (AppShell `PREFETCH`, MentorCard) — failure log #17 | Remove when Home/Bookings/Messages/Settings/Mentor Profile ship |
| Match prompt → external Cal link | "Find my mentor matches" opens an external Cal booking page (`NEXT_PUBLIC_MATCH_CALL_URL`; empty hides the prompt). Product decision 2026-09-26 | **Move matching onto the platform** (sessions run through EduFurther). Needs an on-platform goals/matching flow + backend endpoint |
| Featured mentor | Built on a mock of `GET /api/v1/featured-mentor` (shape settled: mentor or `null`, text field `about_me`) | Backend builds it (round 2 #11) |
| Auth | Not wired; viewer comes from `NEXT_PUBLIC_MOCK_VIEWER`; guest sign-up step advances without an account | Phase B |
| Booking data | Session types, slots and the request are typed mocks in `lib/api/data/booking.ts` | Phase B: backend booking-flow request |
| DS tokens | Warning ramp has only `--yellow-900`; Plus uses literal `#e3b42b`/`#3d2a00`/`#fef6e7` | Add as *our* tokens, recorded in `design-divergence.md` |
| DS `--text-placeholder` | `#98a2b3` on white is 2.58:1 | Use `--ink-500` for placeholders; record divergence |
| DS focus | Readme says inputs focus to a 2px orange ring | We use `--border-focus` (blue-500); record divergence |
| App icons | 192/512 icons are placeholders | Replace when brand icon lands |

---

## The failure log

`references/failure-modes.md` records what has actually gone wrong **in this
codebase**. Add a row whenever something broke that a generic standard would
not have caught.
