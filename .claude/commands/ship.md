---
description: Verify every Definition-of-Done criterion before calling the work done. Reports a verdict, not a summary.
argument-hint: "[route or feature] (optional)"
allowed-tools: Glob, Grep, Read, Bash
---

# /ship

The last gate. `$ARGUMENTS` names the route or feature; if empty, use the working
tree's changes.

This command **verifies**. It does not fix, and it does not summarise what was
built — the user already knows what was built. They need to know whether it holds.

## The Build Verification Gate

Run all of it, not most of it. Report each line's actual result.

```bash
node scripts/check-boundaries.mjs                  # 1
node scripts/review-page.mjs <route>               # 2
node scripts/review-page.mjs <route> --states      # 3
<typecheck>                                        # 4
<lint>                                             # 5
<test>                                             # 6
```

Read the package manager and script names from `package.json` rather than
assuming. If a command does not exist, say so — do not silently skip it.

## Then the things a script cannot check

- [ ] **The screenshots were opened.** Both widths, normal and `--states`. Say so.
- [ ] Every Definition-of-Done criterion from the approved checklist is ticked, or
      explicitly waived with a reason.
- [ ] The four states render, and **error is checked before empty**.
- [ ] Keyboard: every control reachable, visible ring, Escape closes what opened,
      focus returns sensibly after an interaction.
- [ ] No new coverage, lint, or budget threshold was lowered.
- [ ] Any UI claim the code must back ("syncs when you reconnect", "saved
      automatically", a result count) actually holds.
- [ ] `project-conventions` updated if this build settled something that recurs.
- [ ] A row added to `references/failure-modes.md` if something went wrong here
      that a generic standard would not have caught.
- [ ] Conventional Commit, and a changelog line if it is user-visible.
- [ ] An ADR exists if this was a decision rather than an implementation.

## Output

End with an explicit verdict. Not a summary of the work — a statement about
whether it is done.

```
VERDICT: not ready.

  1 check-boundaries        exit 0
  2 review-page /bookings   exit 1  — CLS 0.14 > 0.10 at 390px
  3 review-page --states    exit 1  — error state renders empty-state copy
  4 typecheck               clean
  5 lint                    clean
  6 tests                   48 passed, 0 failed

  Screenshots: opened, both widths, both modes.

  Blocking:
    - error/empty branch order (failure-modes #1)
    - CLS from the avatar images — no width/height

  Not blocking, but note:
    - no changelog line yet for the new filter

  Two fixes, both small. Want me to make them?
```

If everything passes, say so in one sentence and name what you verified. "All six
pass; screenshots reviewed at 390 and 1440 in both modes" is a verdict. "I built
the bookings page and it works well" is not.
