# CLAUDE.md

Router for agents working in this repository.

> **Keep this file short.** It loads on every turn, so anything added here is a
> permanent context cost paid by every task, relevant or not. Depth belongs in a
> skill, which loads only when it applies. If a section here grows past a few
> lines, that is the signal to move it into `.claude/skills/`.

## Two tiers

| Tier | Where | Who owns it |
|---|---|---|
| **Generic standards** | `.claude/skills/` (except `project-conventions`) | The shared package. Overwritten on update — do not edit. |
| **This project** | `project-conventions` skill + this file | You. Never overwritten. |

Anything true only here goes in `project-conventions`, never in a generic skill.

## Start here

| Situation | Use |
|---|---|
| Any non-trivial change | `build-workflow` — six steps, no skipping |
| How *this* project does it | `project-conventions` |
| Before designing any screen | `ux-patterns` — cite the pattern first |
| Deciding where a file goes | `project-structure` |
| Writing or styling a component | `component-standards` |
| A view that fetches | `ui-states` — all four states |
| Hooks, queries, mutations, undo | `data-layer` |
| Any form | `forms-validation` |
| Anything interactive or laid out | `accessibility` — build-time, not review-time |
| Before saying a screen looks right | `page-review` — drive it |
| A dependency, image, font, or animation | `performance` |
| Raw HTML, storage, tokens, URLs, PII | `security-checker` |
| Service worker, install, caching, offline | `pwa-offline` |
| Tests, Storybook, e2e, a flaky suite | `frontend-testing` |
| Tracking, events, a metric that looks wrong | `analytics` |
| Porting from a design source | `design-sync` |
| A consequential choice | `adr`, then `/adr-new` |
| Cutting a release | `release-notes` |
| Something is broken | `/debug <symptom>` |
| Before opening a PR | `/review` |
| Before calling it done | `/ship` |

## Commands

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm test
node scripts/check-boundaries.mjs        # the mechanical half
node scripts/review-page.mjs /           # needs the app running
```

## Non-negotiables

1. **Build bottom-up from accessible atoms.** Every level renders in isolation
   before the next one consumes it.
2. **No component imports the generated API client.** Only the page fetches.
   Enforced by `scripts/check-boundaries.mjs`. Do not weaken the config to pass.
3. **Imports never point upward** — atom → molecule → organism → template → page.
4. **The checklist and Definition of Done are approved before implementation** —
   as text, with no tool calls in the same response.
5. **UX is grounded in a cited pattern**, queried at step 1–2, not after.
6. **All four states ship** — loading, empty, error, content. Error is checked
   *before* empty.
7. **Accessibility is built into the atom**, not audited later.
8. **No raw hex in components.** Tokens only.
9. **You drive the page before calling it done** — `review-page.mjs`, and open the
   screenshots.
10. **Never lower a coverage, lint, or performance threshold to go green.** If a
    threshold is wrong, say so and ask.
11. **Deep checks report findings only.** Never edit during a review, a debug, or
    an audit until the fix and its impact are approved.
12. **Conventional Commits.** The release tooling parses them.
13. **No file over 1000 lines of code** (ESLint `max-lines`, comments not counted).
    Split past 900. Comments say why, briefly.

## Layout

```
src/app/                 routes — the only place that fetches
src/components/          atoms → molecules → organisms → templates
src/lib/api/generated/   generated client — imported by lib/api/data only
src/lib/api/data/        hooks, keys, mutations — the seam
src/lib/vendor/          every third-party SDK enters here
src/styles/              tokens — the only place a colour is defined
docs/adr/                decision records — read before proposing a rewrite
```

Replace this block with your actual tree. The checker also understands the older
`ui/ patterns/ states/ layout/` naming.

## Before saying it's done

Run the Build Verification Gate in `build-workflow`, or `/ship`. All of it, not
most of it. End with the explicit verdict — or say what you found.
