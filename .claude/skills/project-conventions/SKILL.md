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
| Fonts **self-hosted** via `next/font/local` (product 2026-09-27; files in `src/app/fonts/`): Hanken Grotesk (brand), Inter (UI), Poppins (DS button face), Nunito Sans (stands in for Avenir) — subsets cut by `scripts/fonts/build_fonts.py` from google/fonts (OFL) requesting Yoruba/Igbo dot-below, West African letters and ₦ — Inter (all UI text) has them all; Hanken (headings), Nunito (forms) and Poppins have gaps (the build script lists them) and fall back per character; Material Symbols subset of our glyphs via `pnpm icons:pull` (CI `check:icons`). No Google Fonts at build or runtime | Handoff README §6 | licensed Avenir supplied |
| Buttons follow the **CTA hierarchy** (CTA Hierarchy.dc.html, replacing #28): size by placement — `large` 48 (page, flow, modal-footer actions; empty/error states), `medium` 40 (card and section actions; the default), `small` 32 (rows, dense lists, the green match-prompt buttons #41); variant by importance — one filled button per view (a modal is its own view), repeated actions outlined, low-emphasis text, destructive opens a confirm. Labels 14px on large/medium, 12px on small. Phones: medium/small keep their height with an invisible 44px tap area; pinned sheet footers are large and full width | Design + product, 2026-09-27 | design revises the hierarchy |
| Mobile rules (44px targets, 16px inputs, full-screen modals, tighter padding, H3/H4→H6) are **per-component responsive CSS at 768px**, not a global `body[data-ef-mobile]` override | Handoff §7.3 explicitly asks for this | — |
| Every app screen renders inside `AppShell`; nav is never redrawn per screen | Design `CLAUDE.md` | — |
| Empty states are a vertical, centred DS `EmptyState` with the illustration that matches the state | Design `CLAUDE.md` | — |
| Every destructive action confirms in a `Modal tone="danger"` | Design `CLAUDE.md`, Round 7 | — |
| Explore hero, mentee and guest alike: "Find a mentor for your study-abroad journey" / "Get guidance from mentors who have been through the process. Explore free 1:1 mentorship sessions." (design's copy, kept in design reply 2026-09-30: paid sessions don't exist) | Product, 2026-09-26. The design's mentee copy claimed match ranking, which isn't built | match ranking ships |
| The Explore session owns the foundation: scaffold, tokens, DS atoms, AppShell. Other screens reuse it | User, 2026-09-26 | — |
| Explore ships in two phases: A = list + BookingModal on mocked slots; B = real booking endpoints | User, 2026-09-26 | — |
| **Navigation** is design sidebar A, the grouped 88px rail (`AppShell.dc.html` defaults: white rail, logo mark on top, no selected-item ground). **Mentor** (any viewer with a mentor profile, in any state; `viewer.isMentor`): Home, Bookings, Calendar \| Sessions → `/session-types`, Integration, Settings. Phone tabs Home, Calendar, Bookings + More. **Mentee**: Home, Explore, Bookings \| Settings. **Mentors never see Explore** (even if also a mentee). **Admin is never shown**. **Messages is hidden** until it's built. Bookings count badge on the rail and the phone tab counts requests awaiting a response: mentor `booking_counts.as_mentor.awaiting_your_response`, mentee `as_mentee.awaiting_mentor` (product 2026-09-30). The account button shows the viewer's photo, else their initial on their cover's deep tone (same colour as their profile). No live-status dot. No nav items until /me answers (no wrong-set flash) | Product 2026-09-28 and 2026-09-30; backend session-types reply #6 (every mentor state may manage session types) | product revisits roles; Messages ships |
| **Where `/` and Logout go** (product 2026-09-30). `/` has no page: `app/page.tsx` redirects (307, per request) by `homeFor` — platform admin (`is_admin`, even if also a mentor) → `/admin`; any mentor profile → `/dashboard`; mentees, guests and any failed or unlinked `/me` → `/explore`. `/dashboard` and `/admin` are 404 until built (product chose the final routes). Logout ends the session, clears the cache, then a full load of `/login` replacing the entry (no Back into a member page) | Product, 2026-09-30 | the dashboard or admin pages ship under other paths |
| One booking flow, `BookingModal` (`BookingFlow` in `ModalShell`), wherever booking happens — Explore, Mentor Profile, and any later screen. No screen gets its own inline picker. Default `flow=timeFirst`, `signupAt=afterTime`, `payment=placeholder`. Under 768px it is the design's `mobileView=sheet` (ModalShell `sheet` + `footer`). Dates show **7 days at a time, always starting today**, with ‹ › across the session type's booking window: its own, else the mentor's default, else the platform's, capped by the platform maximum, a backend setting (product 2026-09-27; window from backend #309, 2026-09-30). "Bookable up to" offers the 7/14/28/56-day presets under that maximum | Design decisions: Explore; product 2026-09-27 ("consistent booking experience across wherever booking is done") | — |

---

## Product rules

- **Positioning: EduFurther is an experience-led mentorship platform.** Copy is actionable and encouraging, and never claims a capability that isn't built (e.g. match ranking).
- Undesigned states and copy are **held and sent to design** (`docs/handoff/*-design-request.md`), not invented in the build. Interaction states (focus, hover, pressed, disabled, reduced motion) are the exception: the build adds them as *ours*.
- A mentor with **no reviews never shows a star rating**. An empty rating reads as a bad one. Explore cards show "New mentor · Moved from X to the Y" (or "· N sessions") at 0–2 sessions; the profile header leads with the sessions count (plus "· Joined {Mon YYYY}" once the API has it) and the first-mentees card says "New mentor".
- **Profile cover colour** (Mentor Profile.dc.html): with no banner image, the banner is one of 12 light cover colours picked by `coverFor(mentor.id)` (the design's hash, `lib/utils/cover.ts`; tokens `--cover-{key}-bg/-ink`), and the initials circle takes the paired dark colour. Never reorder `COVER_KEYS`: it would change every mentor's cover.
- **BookingModal's first-mentees box** shows on step 1 for a new mentor (under 3 sessions, no reviews) when booked from **Explore** only; the profile already says it in its card.
- A mentor with **fewer than 3 completed sessions is new** (design reply #45): Explore labels the card "New mentor" (and no reviews); the profile shows `FirstMenteesCard` (mentee invitation with "Made the move" / "Got funded" facts and "Book {next open time}"; the owner's "Share your profile" only while the profile is public) at the top of the aside, under the tabs on phones; the track record appears from 1 session and its rating band from 3.
- Times are shown in the **viewer's timezone, with the zone named** ("Times shown in Lagos (WAT) ✎"), via `TimezonePicker`.
- **Mentors can't book** (product, 2026-09-29): a viewer with a mentor profile, in any state (`canBookFor` / `useAppShell().canBook`), never sees a Book control and never opens BookingFlow. On Explore cards and the featured card, "View profile" takes Book's place; on a mentor's profile, the Book controls are hidden (Mentor Profile session applies it).
- Guests never see a match score. Guests sign up **after** choosing a time (`signupAt=afterTime`), and the chosen time is held for 10 minutes.
- A failed load **keeps the user's filters and query**.
- Free vs paid is stated before commitment: "Free mentorship available" or "Paid sessions from $X".
- Paid sessions: the mentee is not charged until the mentor confirms.
- Sentence case everywhere. US spelling. No emoji. "Mentor", never "Coach".
- Review attribution is first name + initial; the surname is never shown (backend guarantees it).
- **Writing a review** (ReviewModal.dc.html, three steps: rating + public text of 20+ characters → the four attribute rows (poor/okay/great) → the goals question 1–5, recommend 1–10 and optional "Feedback for EduFurther"). It's for mentees with a session due (`/me/reviewable-sessions`). The step-1 stars are `overall_rating` (what cards average); the goals question is `valuable_rating`. An author can edit inside the backend's window (`editable_until`, 10 minutes by default): "Thanks, your review is live" + "Edit review", and "Your review" + "Editable until …" on the list item. Edit pre-fills from `GET /reviews/{id}` (author only). "My review of this mentor" comes from `GET /me/authored-reviews?mentor_id=`. `/me/reviews` is reviews **about** the caller, so never use it for this.
- **One role per account** (product 2026-09-29): a viewer with a mentor profile can't book (`canBookFor`), and on another mentor's profile sees no Book, no first-mentees invitation and no review prompts. Dual mentee+mentor accounts are roadmap #55.
- **Deferred work goes to GitHub issues** (product 2026-09-29): anything deferred that's worth exploring later becomes an issue labelled `roadmap` (+ `enhancement`, + an `area: …` label), in the same turn. The PR or divergence row that defers it cites `#N`. The repo is public: describe behaviour only, never spec, handoff or private content. Things decided as "never" stay in design-divergence.md.
- **Reviews tab** (Mentor Profile.dc.html, `reviewsLayout=focus`): shown as "Reviews (N)" at `?tab=reviews` only when N > 0; the header rating opens it. The aside keeps the first-mentees and booking cards but drops the track record (and Similar mentors). Five reviews a page, newest first, "Show N more reviews" (a text button in the Medium box). A **guest** fetches one review and its text is dropped in the data layer (`toReview(r, guest)`), so it never reaches the page; the sign-up card follows. The "{n} in 10" box shows only when the API sends `would_recommend_in_10`; "Most praised for" is the top 2 rated attributes. A deleted author reads "Deleted user" with the DS icon avatar.
- **Similar mentors** (Mentor Profile.dc.html aside): three rows from `GET /mentors/{handle}/similar`, at the bottom of the **Overview** aside only, for mentees and guests (never the owner or another mentor: product 2026-09-28). Rows use Explore's card rules (`toMentor`: "New" under 3 sessions, no rating without reviews). "Free {day}" (`formatFreeDay`, viewer's zone) links to that mentor's profile. A suggestion, not content: an empty or failed list renders no card.

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
| New mentor | Explore label and profile card for a mentor under 3 completed sessions (label also needs no reviews). Was "Rising mentor" until design reply #45 | — |
| Plus | Premium mentor tag (gold, dark text) | a paid plan for mentees |
| Match | % fit to the mentee's onboarding goals. **Not built** (tweak `matchScore=hide` is the default) | a search relevance score |

---

## The contract

| Question | Answer |
|---|---|
| Handoffs | `docs/handoff/<screen>-backend-request.md` → backend session answers in `<screen>-backend-reply.md` (it writes there directly) |
| Where is the spec? | Backend FastAPI OpenAPI at `/openapi.json` (repo `c:/pythonwork/edufurtherBE`). `/docs` is the contract (backend ADR 0016 §4) |
| How is the client generated? | `openapi-typescript` → `src/lib/api/generated/schema.ts` from `openapi/openapi.json` (`pnpm gen:api`); `openapi-fetch` client created once in `lib/api/data/http.ts`. **Spec, generated client and `docs/handoff/` are private** — git-ignored, never committed (public repo). `pnpm spec:pull` downloads it (below). `pnpm check:private` enforces it |
| Where does the spec come from? | Product (2026-09-27): the backend CI publishes `openapi.json` on every merge to main as the rolling release `openapi-latest` on `edufurtherbe` (public repo, public spec, no token). `pnpm spec:pull` downloads it; CI and Vercel need no secret for it |
| Building ahead of the backend | Product (2026-09-27): **the typed client only knows what the backend has shipped.** An endpoint or field that isn't in the published spec yet lives in the data-layer mock (untyped, marked `PENDING BACKEND`) and is wired to the generated client when it ships. No overlay, no spec secret, no dashboard config — a build needs only the published spec and `BACKEND_URL` |
| Where does the generated client live? | `src/lib/api/generated/` — imported only by `src/lib/api/data/` |
| Base path | `/api/v1/...` |
| Response envelope | Lists: `{ data: [...], next_cursor: string \| null }` |
| Error envelope | RFC 9457 Problem Details, `application/problem+json`: `{type, title, status, detail}`. **`detail` is not assumed safe to show**; map by `status` to our own copy. 401 carries no detail; 500 detail is withheld |
| Error codes that need specific UI | `422` on a list = bad cursor → restart from page 1. `404` on `/mentors/{handle}` = not found / not public (indistinguishable on purpose). Booking conflicts: see backend ADR 0024 — to confirm |
| Pagination style | Opaque cursor, `?cursor=&limit=` (default 10, max 50; Explore uses 10 — product, 2026-09-27). `total` on the first page only (coming) |
| Explore filters | `?offering=<slug>` repeatable, **ANY-of**, narrowed by `q`; slugs are the catalog `code` from `/api/v1/catalog/service-offerings`. Unknown slug → 422 |
| Local dev | Phase A: `.env.development` points at the in-app mock (`/api/mock`, `ENABLE_MOCK_API=1`). Real backend: `NEXT_PUBLIC_API_BASE_URL=` (empty) + `BACKEND_URL=http://localhost:8000` |
| Deployed API calls | Product (2026-09-27): same-origin proxy. The browser calls `/api/v1/…` on the app; `next.config.ts` rewrites to server-only `BACKEND_URL` (Vercel prod → prod backend, previews → `edufurtherbe-dev`, never prod). No CORS entry per preview URL. Vercel env table in README |
| Auth | Supabase, passwordless email code (+ magic link) — backend auth reply 2026-09-27. `lib/vendor/supabase/` is the only importer of `@supabase/*` (vendorSeams). Session in cookies via `@supabase/ssr`, refreshed in `src/proxy.ts`; never localStorage. The proxy also passes the verified user id to the render (`x-ef-session`, always overwritten; a chrome hint, never authorization) and the root layout seeds `useSession` with it, so the first paint has the member or guest chrome (failure log #37). A failed check sends no hint (the browser decides). Trade-off, accepted (product 2026-09-30): reading it in the root layout renders every page per request, no static prerender; pages fetch in the browser anyway and warm LCP matched main. `http.ts` middleware sends `Bearer`, refreshes once on 401, else signs out. Viewer from `GET /api/v1/me`: 401/none → guest, first sign-in creates the account (backend PR #238): **404 → `unlinked`** (token without email, or deleted account), **409 `/problems/account-exists` → `accountExists`** (email belongs to an existing unlinked account: "contact support"), goal → mentee, approved `mentor_profile` → mentor; never `primary_role`. Query keys carry the session identity (signed-in lists differ). Post-sign-in destinations go through `safeReturnTo` (local paths only). Password + Google: backend WIP, not offered |
| Idempotency | Booking is idempotent and scoped to the caller (backend ADR 0024) — key format to confirm before BookingModal is wired |

---

## Design source

| Question | Answer |
|---|---|
| Where is the design? | https://claude.ai/design/p/fb0b8ef2-d0b9-4366-b6ab-33f22c441cd8 (DS project `c4e21801-7d61-406c-9736-fe03d681ec21`) |
| Which files? | The project's **root** files (`Mentor Profile.dc.html`, `ReviewModal.dc.html`, `CoverPicker.dc.html`, …): design edits those. `design_handoff_edufurther_mentor/designs/` is an older snapshot, so never sync from it (2026-09-30). The local mirror `C:\pythonwork\edufurther-design-mirror` holds the root files. |
| Which parts are ported? | Explore (`/explore`): tokens, atoms, AppShell, ModalShell (incl. the phone sheet), MentorCard, MentorResults, BookingFlow (real slots, 7-day week view). Mentor Profile (`/mentors/[handle]`, slug or id) PR 1: read-only header, Overview, Sessions, booking card, track record, owner view; Reviews, Similar mentors and editing follow. Session Types (`/session-types`, mentor nav "Sessions", 4 PRs): PR 1 building blocks (Switch, Radio, Select, SegmentedControl, RadioCards, WizardSteps, FormField, ModalShell `icon`/`tone`, mentor nav); PR 2 the list (`/session-types`: Live switch, delete, or schedule the deletion while sessions are booked (#80), templates, four states); PR 3 create (`/session-types/new[?template=]`: 4-step wizard — up to 3 topics, icon, stage, text / file / single / multiple-choice questions, length + notice, window + break inherit or own, dedicated hours, approval; one POST with questions + Idempotency-Key, then windows) |
| Where do tokens come from? | `_ds/edufurther-design-system-…/tokens/*.css` → `src/styles/tokens/` |
| Where is divergence recorded? | `references/design-divergence.md` |
| What is deliberately not from the design? | Focus rings, disabled/busy, skeleton colour, reduced-motion, a text-on-photo scrim token — listed as *ours* in `design-divergence.md` |

Prototype files (`support.js`, `image-slot.js`, `dc-import`, `sc-if`) are the prototype runtime. **Never port them.**

---

## House conventions

**Design conformance — non-negotiable (product, 2026-09-27).**
1. The `.dc.html` markup is the spec. Read every value (size, radius, padding, colour,
   shadow, weight, line-height, gap, inset) from the element's inline style — never
   from `Design decisions.md` prose, which describes intent, not values.
2. Reuse a class only if the design's values for both elements are identical. Two
   buttons that look alike in prose ("green outline") are often different specs.
3. Before a PR, measure computed styles in Playwright against the design values for
   every new or changed element, and list the table in the PR. A mismatch is a bug,
   unless it is a recorded divergence in `references/design-divergence.md`.

- **File size (product, 2026-09-29):** at most 1000 lines of code per file (comments and blank lines not counted), enforced by ESLint `max-lines`. Start splitting a file once it passes 900: a component into sub-components or hooks, a test file by concern with a shared harness. Never raise the limit to pass.
- **Comments are short:** say why, not what; don't restate the code; no history ("changed in #NN") unless it guards a regression.
- Route folders kebab-case; components PascalCase.
- Route-local components live in `src/app/<route>/_components/` until a second route needs them. Page logic shared by routes lives in `src/app/_shell/` (`useAppShell` — chrome and account menu — and `bookBlockedFor`).
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
| Track `openapi/`, `src/lib/api/generated/` or `docs/handoff/` in git | this repo is public and they map the backend API. Product (2026-09-27): repo stays public; these are git-ignored and `pnpm check:private` fails CI if one is tracked. `.claude/` stays tracked by decision — process docs whose contract notes cover only what the public client already calls. Old versions remain in history (no rewrite, by decision) |
| Push straight to `main` | every change goes through a PR with green CI, `/code-review` and `/security-review` (2026-09-26) |

---

## Known rough edges

| Where | What is wrong | Plan |
|---|---|---|
| Links to unbuilt screens | `prefetch={false}` (AppShell `PREFETCH`) — failure log #17. Profile links stay `prefetch={false}` too: Next cancels its own prefetch streams and `review-page` flags them (failure log #25) | Remove when Home/Bookings/Messages/Settings ship; profile links only if prefetch stops aborting |
| Match prompt → external Cal link | "Find my mentor matches" opens an external Cal booking page (`NEXT_PUBLIC_MATCH_CALL_URL`; empty hides the prompt). Product decision 2026-09-26 | **Move matching onto the platform** (sessions run through EduFurther). Needs an on-platform goals/matching flow + backend endpoint |
| Featured mentor | Built on a mock of `GET /api/v1/featured-mentor` (shape settled: mentor or `null`, text field `about_me`) | Backend builds it (round 2 #11) |
| Auth in booking | Guest sign-up step in BookingFlow still advances without an account (EmailCodeForm is ready to drop in) | B2 |
| Support channel | `accountExists` notice says "contact support" with no link — no support channel defined | product names one (design request #27) |
| Booking data | Session types, slots, the request and the intake answers are real (backend #268, #12, #282). The questions step asks every kind: text, single choice (radios), multiple choice (chips), file (uploaded on pick to `/me/intake-files`, PDF / .docx, 5 MB). Required answers gate Request; the backend enforces them once `REQUIRE_INTAKE_ANSWERS` is on (issue #283). Previews have sign-in off, so a real request there is a 401 ("Log in to book this session.") | Choice and upload states are ours until design request #6 answers |
| DS tokens | Warning ramp has only `--yellow-900`; Plus uses literal `#e3b42b`/`#3d2a00`/`#fef6e7` | Add as *our* tokens, recorded in `design-divergence.md` |
| DS `--text-placeholder` | `#98a2b3` on white is 2.58:1 | Use `--ink-500` for placeholders; record divergence |
| DS focus | Readme says inputs focus to a 2px orange ring | We use `--border-focus` (blue-500); record divergence |
| App icons | 192/512 icons are placeholders | Replace when brand icon lands |

---

## The failure log

`references/failure-modes.md` records what has actually gone wrong **in this
codebase**. Add a row whenever something broke that a generic standard would
not have caught.
