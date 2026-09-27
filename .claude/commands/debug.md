---
description: Diagnose a frontend symptom — reproduce, narrow, find the mechanism, propose one fix with its impact. Does not edit.
argument-hint: "<symptom>"
allowed-tools: Glob, Grep, Read, Bash, Task
---

# /debug

Symptom: `$ARGUMENTS`

If no symptom was given, ask for one. "It's broken" is not a symptom — ask for the
route, what the user did, and what happened.

## This command does not fix

It diagnoses and proposes. The fix and its impact are approved before any file
changes. Diagnosing and fixing in one pass is how the real cause stays hidden
behind a change that made the symptom go away.

## 1. Check the failure log first

`.claude/skills/project-conventions/references/failure-modes.md`

It records what has gone wrong **in this codebase**, which is a far better
predictor than any generic standard. A symptom that matches a logged row is
usually the same bug, and the row names the fix.

## 2. Reproduce

```bash
node scripts/review-page.mjs <route>
node scripts/review-page.mjs <route> --states
```

Record: route, viewport, state the user was in, steps, expected vs actual, and
whether it reproduces every time. Read the console errors, the failed requests with
their URLs, and the screenshot.

If it does not reproduce, stop and say so. An unreproduced bug gets
instrumentation, not a fix.

## 3. Locate the layer before reading component code

| Question | If yes |
|---|---|
| Wrong response in the network tab? | it is the API, not the UI — say so and stop |
| Right response, wrong render? | data layer or component |
| Only after a specific interaction? | state, or a stale closure |
| Only on a second visit? | cache, storage, or a service worker |
| Only in production? | bundling, env var, or a `'use client'` boundary |
| Only at one viewport? | CSS — the review script named the element |
| Only for one user or role? | an unexpected data shape, or authorization |

## 4. Delegate the dig

Spawn the `debugger` agent with everything gathered so far. It narrows, finds the
mechanism, and reports.

## 5. Report

```
SYMPTOM        what happens, where, how reliably
MECHANISM      why — one sentence that names the cause, not "the state was wrong"
EVIDENCE       screenshots, console lines, network entries, file:line
PROPOSED FIX   the smallest change; alternatives if there is a real choice
IMPACT         what else it touches, and what you are trading
REGRESSION     the test that fails before the fix
```

Then stop and wait.

## 6. After it is approved and fixed

- The regression test **failed before the fix**. Watch it fail; a regression test
  that never failed is asserting something else.
- Add a row to `failure-modes.md` if a generic standard would not have caught it.
- If the mechanism was a missing rule rather than a mistake, the rule belongs in
  `project-conventions` — or in the boundary checker, if it can be mechanised.
