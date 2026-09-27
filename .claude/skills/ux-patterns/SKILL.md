---
name: ux-patterns
description: Ground interaction design in a cited pattern before implementing — query the BFM pattern source at step 1-2 of the build workflow, record the citation and the deviation, and check the pattern's known failure modes. Use before designing any screen or flow, when choosing between two interaction approaches, when a design has no precedent, when someone proposes a novel interaction, or when a flow tests well and still fails in production.
---

# UX patterns

**Queried before the checklist, not after.** A pattern found after implementation
is a rewrite.

Interaction design invented on the spot looks finished, ships, and fails quietly
in the place where a user gives up. The failure is silent because the user does
not file a ticket — they just stop.

## The rule

Before any screen or flow is designed, find the established pattern for it and
**cite it**. The citation goes in the checklist, and survives into the commit or
the ADR.

```
Pattern: progressive disclosure for optional profile fields
Source:  BFM — <pattern id / title>
Applies: the 11 optional fields collapse behind "Add more details"
Deviates: we keep `role` visible, because it changes what the rest of the form asks
Known failure: users miss the collapsed section entirely when it sits below the
  submit button — so it goes above.
```

Four lines. The fourth is the one that pays for the exercise.

## Querying the pattern source

The BFM MCP is the pattern source this package assumes. Query it at build-workflow
step 1–2:

- Search by the **user's goal**, not your component name. "Recover a deleted item",
  not "undo toast".
- Read the pattern's **failure modes**, not only its description. That section is
  what you could not have guessed.
- Take the **constraints** verbatim into the Definition of Done — "the affordance
  must be visible without scrolling" is a checkable criterion.

If the MCP is unavailable, say so in the checklist and cite a named, linkable
alternative — a platform HIG, WAI-ARIA Authoring Practices, or an internal
precedent recorded in `project-conventions`. **"Standard practice" is not a
citation.** It cannot be checked, and it is usually a memory of one other product.

## No pattern exists

Sometimes there is genuinely no precedent. Then:

1. Say so explicitly, rather than quietly inventing.
2. Find the **nearest** pattern and name what differs.
3. Write down what you expect users to do and what would prove you wrong.
4. Record it as an ADR — a novel interaction is a decision, not an implementation.
5. Add analytics for the step you are least sure about, before shipping.

A novel interaction with no measurement is a guess you will never resolve.

## Deviating from a pattern

Deviation is allowed. Undocumented deviation is not.

| Record | Example |
|---|---|
| What the pattern says | "destructive actions confirm" |
| What we do instead | "delete applies immediately with a 5s undo" |
| Why | "bulk cleanup is the main job; confirming 40 times is the real harm" |
| What we accept | "an accidental delete noticed after 5s needs a restore flow" |

The last row is the one that gets skipped, and it is the one that tells the next
person whether the trade was made knowingly.

## Patterns whose failure modes are always underestimated

| Pattern | The failure people miss |
|---|---|
| Infinite scroll | the footer becomes unreachable; no way to return to a position |
| Modal over a form | unsaved input lost on backdrop click |
| Toast confirmation | dismissed before it is read; invisible to screen readers without a live region |
| Optimistic update | silent rollback reads as the app ignoring the click |
| Inline edit | no visible affordance that the text is editable |
| Hover-only disclosure | does not exist on touch, or by keyboard |
| Multi-step wizard | deep link to step 3 with no state |
| Autosave | no indication of *when* it last saved; user cannot tell if it is safe to close |
| Search-as-you-type | results from an abandoned query arrive last and win |
| Bulk select | "select all" means the page, user thinks it means the result set |
| Empty state with no action | user cannot tell whether it is broken or new |
| Destructive confirm dialog | trained-away; users click through it |

Reach for this table when the design is silent about what happens in the unhappy
case.

## The interaction budget

A pattern is only grounded if the whole flow is, not just the screen.

For any flow, write down:

- **Entry**: how does the user get here, and what do they already know?
- **Exit, success**: where do they land, and how do they know it worked?
- **Exit, abandon**: what happens to what they had typed?
- **Re-entry**: they come back in ten minutes — same state, or reset?

Most "the design looks fine but users get stuck" bugs are a missing answer to the
third or fourth of those.

## Hand-off into the build

The citation makes three things concrete in the Definition of Done:

```
- [ ] Undo affordance visible without scrolling (pattern constraint)
- [ ] Undo reachable by keyboard and announced politely (pattern failure mode)
- [ ] Pending delete flushed on navigation (pattern failure mode)
```

That is what "grounded in a pattern" means in practice: the pattern's known
failure modes became checkboxes before any code existed.

## Record it

- A pattern chosen once, for one screen → the commit message.
- A pattern that now governs how this product behaves → `project-conventions`.
- A deliberate deviation, or a novel interaction → an ADR via `/adr-new`.
- A pattern that failed **here** → a row in `references/failure-modes.md`.
