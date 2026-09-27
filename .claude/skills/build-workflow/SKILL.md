---
name: build-workflow
description: The end-to-end delivery workflow for frontend work — discuss, confidence check, approved checklist, Definition of Done, implement, docs and commit. Use when starting any non-trivial unit of work, when the user asks to "build", "add", "implement", or "fix" a screen or component, when decomposing a large build, when blocked by a missing API or design, or before declaring anything done.
---

# Build workflow

Six steps. The gate between step 4 and step 5 is unconditional.

```
Discuss → Confidence Check → Checklist → Definition of Done
                                                │
                                        [CHECK-IN GATE]
                                                │
                                   Implement → Docs + Commit
```

## 1. Discuss

Restate the request in your own words and say what you believe the user *gets*
when it works. If that sentence is hard to write, the requirement is not yet a
requirement.

Then ask about the parts that will otherwise be invented:

- Which of the four states has a design? (See `ui-states`.)
- Where does the data come from, and what does the contract actually return?
- Is there an existing component at the right atomic level, or is this new?
- What must *not* change — a URL, an event name, a saved filter?

**Query `ux-patterns` here**, not later. A cited interaction pattern found after
implementation is a rewrite, not a review note.

## 2. Confidence check

Score your confidence that you can build this correctly without guessing, out
of 10. State the score and, more importantly, what is costing you the points.

**Below 8, stop and resolve the blockers, then re-score.** Common deductions:

| Missing | Cost |
|---|---|
| The error state's copy | 1–2 |
| The real shape of the API response | 2–3 |
| Whether this is a new component or a variant of an existing one | 1 |
| The empty state entirely | 1–2 |
| Which level of the hierarchy this belongs at | 1 |
| Who owns the loading skeleton's dimensions | 1 |

A 6 is not a reason to work harder. It is a list of questions.

## 3. Checklist

Write the implementation as an ordered list of changes, bottom-up: atoms first,
page last. Each item names the file and the level.

```
1. atoms/Badge.tsx — new. variants: neutral | warning | success. no data.
2. molecules/ProfileRow.tsx — compose Avatar + Badge. props only.
3. organisms/ProfileList.tsx — renders four states from props.
4. app/profiles/page.tsx — the only place that fetches.
5. ProfileRow.stories.tsx — all three Badge variants + long-name overflow.
```

Bottom-up is not a preference. A component built top-down is shaped like the one
screen it was extracted from, and every later consumer pays for that.

## 4. Definition of Done

Written *before* implementing, as concrete criteria a reviewer can check. Not
"works well" — the thing a reviewer looks at.

```
- [ ] All four states render in Storybook, including empty and error
- [ ] node scripts/check-boundaries.mjs exits 0
- [ ] node scripts/review-page.mjs /profiles exits 0 at 390 and 1440
- [ ] node scripts/review-page.mjs /profiles --states — error state looked at
- [ ] Keyboard: every control reachable, visible ring, Escape closes the modal
- [ ] No new raw hex, no new client import below the page
- [ ] Long-name and zero-item cases covered in stories
```

## The check-in gate

**Approval before any implementation. At any score, including 10/10.**

The response that contains the checklist and the Definition of Done contains
**no tool calls**. Not a file read "to confirm", not a quick edit. A response
that proposes a plan and starts executing it has not been approved — it has been
announced.

This is the step most worth not skipping, because it is the only one where a
wrong assumption is still cheap.

## 5. Implement

Work the checklist in order. Each component renders in isolation before the next
level consumes it — that is what makes the four states get looked at rather than
assumed.

When you hit something the checklist did not anticipate:

- A one-line difference: make it, and say so in the commit.
- Anything that changes the shape of the plan: stop, say what you found, and
  get the revision approved. Re-planning silently is how a three-file change
  becomes a thirty-file change.

When blocked by a missing API or design:

| Blocked on | Do |
|---|---|
| An endpoint that doesn't exist yet | Build against the agreed contract behind a typed mock in the data layer, not in the component. Note the mock in the commit. |
| A design with no empty/error state | Propose copy, mark it provisional, list it for design. Do not ship an unstyled fallback. |
| A design that contradicts the design system | Build the system version, record the divergence via `design-sync`. |

## 6. Docs + commit

- Conventional Commits. The release tooling parses them.
- Update `project-conventions` when this build settled something that will
  recur. A decision made twice and written down nowhere will be made a third
  time, differently.
- Add a row to `references/failure-modes.md` when something went wrong here that
  a generic standard would not have caught.
- A consequential choice gets an ADR — see `adr`, then `/adr-new`.

## Build Verification Gate

Before saying it is done, all of it:

1. `node scripts/check-boundaries.mjs` — exits 0
2. `node scripts/review-page.mjs <route>` — exits 0 at every configured width
3. `node scripts/review-page.mjs <route> --states` — and **open the screenshot**
4. Type check and lint clean, no new suppressions
5. Tests pass; a new regression test exists for anything that was broken
6. Every Definition-of-Done box ticked, or explicitly waived with a reason

End with the verdict in words — "all six pass" or "five pass, here is what
number three found". A summary that lists what you built instead of what you
verified is not a verdict.

## Deep checks report findings only

A review, a debug, or an audit **never edits**. It reports what it found and
what it would change, and waits for the fix and its impact to be approved. The
moment a review starts fixing, nobody knows what the original state was.
