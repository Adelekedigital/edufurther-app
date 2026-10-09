# AGENTS.md

Instructions for Codex and other agents working in this repository.

The rules live in `CLAUDE.md` (non-negotiables and layout) and
`.claude/skills/project-conventions/SKILL.md` (product rules, vocabulary, the API
contract). `.claude/skills/project-conventions/references/failure-modes.md` lists
what has actually broken here. Read them before reviewing. This file does not
repeat them. It says what a review should look for.

EduFurther is a Next.js App Router + React + TypeScript frontend for a
study-abroad mentorship platform. Mentees and guests find mentors and book 1:1
sessions. Mentors manage their profile and session types.

## Review guidelines

Report a bug by what the user sees go wrong: the inputs or state, then the wrong
output. Cite `file:line` and propose one fix. If you are unsure, say so. Don't
make it sound more certain than it is.

### Severity

The one definition, used by every reviewer of this repository (owner, 2026-10-09).

- **P0, critical: must fix.** Leaks data across users, forges or corrupts money,
  credits, refunds or attendance, bypasses authentication or authorization, or
  loses committed data.
- **P1, major: must fix.** Breaks a user flow or a published contract, corrupts
  a row, or fails under a value the configuration or API permits.
- **P2, minor: fix if cheap.** A real defect with a narrow trigger, or a published
  description that contradicts the code. Not required to merge.

The lists below say what each level looks like in this frontend.

### How to write the review

Spend the review on findings that matter. Every sentence should help someone
fix a bug.

- Be direct. Start each finding with the defect, not with praise, background or
  hedging.
- No emoji, in titles, bodies or summaries.
- No summary of what the PR does, no restating the diff, no closing remarks.
- One finding per comment. A one-line title, then at most three sentences: the
  failing scenario, why it happens, the fix. Add a short code suggestion only
  when it is clearer than prose.
- Report only P0, P1 and P2 findings, as defined above and in the lists below. Leave out anything you
  can't tie to a concrete failure.
- Don't repeat a finding on the same lines that an earlier review raised and
  that the author answered, unless the new commit brings the problem back.
- If there are no findings, say nothing.

### Treat as P1

**Wrong facts on screen**
- The same fact read from two sources that can disagree (a card and a modal, a
  first page and a later page). Keep the newest data, or derive both from one
  source.
- Form defaults that depend on loaded data but are set at mount. They must be
  set when the data first arrives.
- Times not shown in the viewer's chosen time zone, or shown without the zone.

**States**
- Every view that fetches renders loading, empty, error and content. **Error is
  checked before empty.** A failed request must never read as "nothing here".
- A failed load drops the user's filters or query. A failed submit (including a
  422) clears the form's values.

**Boundaries** (`scripts/check-boundaries.mjs` catches some of these, not all)
- Anything outside `src/lib/api/data/` imports `src/lib/api/generated/`.
- A component fetches. Only routes in `src/app/` fetch.
- An import points up the atomic levels (atom → molecule → organism → template →
  page).
- A third-party SDK is imported outside `src/lib/vendor/` (`@supabase/*` only in
  `lib/vendor/supabase/`).

**Security and privacy.** This repo is public.
- `openapi/`, `src/lib/api/generated/` or `docs/handoff/` gets tracked. Content
  from them gets copied into code, comments, tests or PR text.
- Problem Details `detail` is shown to the user as-is. It must map by `status`
  to our own copy.
- A redirect target from the URL or user input doesn't go through
  `safeReturnTo`.
- An auth token or session goes into `localStorage`/`sessionStorage`.
- `dangerouslySetInnerHTML` or an unvalidated URL renders untrusted content.
- A reviewer's surname is shown, or a guest's review text reaches the page (it
  must be dropped in the data layer).
- A secret appears in a `NEXT_PUBLIC_*` variable.

**Product rules**
- A viewer with a mentor profile sees a Book control or can open `BookingFlow`.
- A star rating appears for a mentor with no reviews ("★ 0" reads as a bad
  rating).
- A guest sees a match score. Copy claims a feature that isn't built, such as
  match ranking.
- A destructive action has no confirm in `Modal tone="danger"`.
- A screen builds its own booking picker instead of using `BookingModal`.

**Mutations and data**
- A double submit is possible: the button isn't disabled while the request is in
  flight, or an endpoint that takes an `Idempotency-Key` doesn't get one.
- An optimistic update has no rollback on failure.
- A write doesn't invalidate the queries whose data it changes.
- A query function doesn't pass `signal` through, so a stale response can
  overwrite a newer one.
- A query key leaves out the session identity, so signed-in and guest data share
  a cache entry.

**Accessibility**
- An interactive element has no accessible name.
- An accessible name is built from visible text plus an `.sr-only` fragment that
  starts with punctuation. Use `aria-label`.
- A status or error message goes into a live region that arrives with its text
  already in it. Use the screen's always-present `LiveRegion`.
- Focus falls to `<body>` when a control removes itself or a dialog closes.
- A dialog doesn't trap focus or close on Escape.
- A tap target is under 44px on phones, or an input's font is under 16px there.

**Layout**
- An `.sr-only` element sits inside an `overflow` container with no positioned
  ancestor. It escapes the clipping and widens the page.
- A negative-margin overlap only works if content wraps at a certain width.
- A layout check measures an element with `display: contents`. It has no box.

### Also flag (P2)

- Raw hex, `--brand-*` or `--orange-*` in a component. Use tokens, semantic
  aliases first.
- A value that doesn't match the design and isn't a recorded divergence.
- A lowered coverage, lint or performance threshold, an `eslint-disable` added
  to go green, or a file past 1000 lines of code.
- `<Link>` prefetch turned back on for profile links or routes that aren't
  built yet.
- New behaviour with no test, or a test that checks implementation details
  instead of what the user sees. A fixed bug with no regression test.
- Copy that breaks house style: sentence case, US spelling, no emoji, "Mentor",
  never "Coach".
- A comment that restates the code or narrates history instead of saying why.
- A PR title that isn't a Conventional Commit (the release tooling parses them).

### Do not flag

- Anything CI decides. It runs typecheck, ESLint (including the 1000-line file
  limit), the layer boundary check, the full test suite with coverage, a
  production build, a bundle secret scan, the private-path and icon-font checks,
  and a page review on every push. Never suggest lowering a threshold, adding an
  ignore, or raising a limit to make a check pass.

- Differences from the design recorded in
  `.claude/skills/project-conventions/references/design-divergence.md`.
- Untyped mock endpoints marked `PENDING BACKEND` in the data layer. They are
  wired to the typed client when the backend ships them.
- Missing `openapi/` or `src/lib/api/generated/` files. They are git-ignored on
  purpose, and CI pulls them.
- `.claude/` being tracked. That is a decision.
- A state or piece of copy that is missing because it's waiting on design.
  Undesigned states are sent to design, not invented in the build.
- Formatting and lint-level style that ESLint already enforces.
