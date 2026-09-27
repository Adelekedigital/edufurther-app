---
description: Run the pre-PR review — mechanical checks, both reviewers, and the checklists the change triggers.
argument-hint: "[route or path] (optional)"
allowed-tools: Glob, Grep, Read, Bash, Task
---

# /review

Run before opening a PR. Reports findings; changes nothing.

Target: `$ARGUMENTS` (if empty, review the working tree's changes and infer the
affected routes from the changed files).

## 1. Mechanical first

Anything a script catches is not worth a human's attention.

```bash
node scripts/check-boundaries.mjs
node scripts/review-page.mjs <route>
node scripts/review-page.mjs <route> --states
```

Report each exit code. If the page reviewer could not run, say so explicitly —
a code-only review must not be presented as a page review.

## 2. Read this project's rules

`.claude/skills/project-conventions/SKILL.md`, and
`references/failure-modes.md`. A finding that contradicts a settled decision is
not a finding; a recurrence of a logged failure mode is a blocker.

## 3. Spawn both reviewers

In parallel:

- **`code-reviewer`** — levels and import direction, data layer, state, component
  API, tests, performance cost, security.
- **`ui-reviewer`** — the four states, copy, keyboard and a11y, dead controls,
  responsive, unbacked claims. Reads the screenshots.

Neither edits.

## 4. Apply the triggered checklists

Load the skill for each area the diff touches, and check its Definition of Done —
not the whole catalogue, only what this change touched.

| The diff touches | Load |
|---|---|
| a component's props, variants, or styling | `component-standards` |
| a view that fetches | `ui-states` |
| a hook, query key, or mutation | `data-layer` |
| a form or validation | `forms-validation` |
| anything interactive or laid out | `accessibility` |
| a new dependency, image, font, animation | `performance` |
| raw HTML, a URL, storage, a token, an env var, personal data | `security-checker` |
| a service worker, caching, offline, install | `pwa-offline` |
| tracking or events | `analytics` |
| a screen you are about to call finished | `page-review` |
| ported design, tokens, or a divergence | `design-sync` |
| a new file's location, or import direction | `project-structure` |
| tests or stories | `frontend-testing` |
| a Definition of Done that must be re-checked | `build-workflow` |
| anything this repo does differently | `project-conventions` |
| a decision rather than an implementation | `adr` |
| a new interaction pattern | `ux-patterns` |
| a user-visible change worth a changelog line | `release-notes` |

## 5. Output

One consolidated report, deduplicated across the two reviewers, in severity order:

```
BLOCKER        ships a bug, a regression, or a security hole
SHOULD FIX     a user will notice; fix before merge
CONSIDER       worth doing, not worth blocking
NOTES          what was checked and found clean
```

For each finding: file and line (or route and state), what the consequence is, and
the smallest change that addresses it.

End with:

- the verdict — what blocks the PR, and what does not
- which mechanical checks ran, and their exit codes
- whether the screenshots were opened
- anything that **could not** be checked, and why

A review that quietly skipped the page reviewer and says nothing about it is worse
than no review.
