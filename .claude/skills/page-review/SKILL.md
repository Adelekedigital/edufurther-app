---
name: page-review
description: Drive the page with Playwright before saying a screen looks right — run review-page.mjs at every width, force the failure states, read the focus trace and axe output, and open the screenshots. Use before declaring any screen done, when a layout looks wrong at some size, when reviewing someone's UI change, when a page feels slow, or when a bug reproduces only in a real browser.
---

# Page review

Reading the code tells you what **should** render. Driving it tells you what
**does**.

```bash
node scripts/review-page.mjs /profiles
node scripts/review-page.mjs /profiles --states          # force the failure path
node scripts/review-page.mjs /profiles --base http://localhost:5173
```

The app must be running. Exit 0 means clean; 1 means something failed; 2 means it
could not run.

## What each run captures, per width

| Capture | What it catches |
|---|---|
| Full-page screenshot | everything no scan can see |
| Console errors, page errors | the warning that has been there for months |
| Failed and 4xx requests, **with URL** | the silently missing avatar endpoint |
| Horizontal overflow + the worst element | the classic responsive break |
| Keyboard focus-order trace | order that makes no sense; stops with no ring |
| axe scan (WCAG 2.0/2.1 A + AA) | labels, contrast, roles, landmarks |
| LCP, CLS, transfer weight vs budgets | the 900kB hero nobody noticed |

Default widths are 390 and 1440 — a phone and a laptop. Add more in
`package.json` if the product has a real tablet or ultrawide layout.

## Open the screenshots

This is the step that gets skipped, and it is the one the whole script exists for.

**A green report with an unreadable page is still a broken page.** No scan sees:

- the heading overlapping the card
- two elements that are both technically visible and mutually illegible
- an icon at 4px because its container collapsed
- text over an image with no scrim, readable in the design and not in the build
- a skeleton that looks nothing like the content it stands in for

Look at every screenshot the run produced, at both widths.

## Run it with `--states`

`--states` forces API responses to fail so the error path actually renders.

This is not an edge case. It is the state the design gave you nothing for, which
means it is the state most likely to be wrong — and the one you cannot reach by
clicking around a working dev server.

```bash
node scripts/review-page.mjs /profiles --states
```

Then look at *that* screenshot too. Common finds: a raw error object on screen, an
empty state where an error belongs, a retry button that does nothing, a skeleton
that never resolves.

For the empty state, drive it with real empty data rather than a forced failure —
a filter that matches nothing, or a fresh account.

## Reading the focus trace

The trace lists each Tab stop in order:

```
focus order     7 stop(s)
  a "Skip to content"
  button "Open menu"
  input "Search profiles"
  button[tab] "All"
  button[tab] "Archived"
  a "Ada Lovelace"
  button "Add profile"
focus issues    2
  - no visible focus ring: <div role=button> "Filter"
  - focus stop with no accessible name: <button>
```

The script tells you the order; **only you can say whether the order makes
sense.** Things to check by eye:

- Does it follow reading order, or jump to the footer and back?
- Does the primary action come before ten filter chips?
- Are there stops the user cannot see (a closed menu still in the DOM)?
- Does a modal's trace stay inside the modal?

A stop with no visible ring is a hard failure — see `accessibility`.

## Reading the budget output

```
vitals          LCP 3180ms   CLS 0.142   (INP not measured — needs a real interaction)
weight          total 1420kB   JS 380kB   CSS 41kB   img 960kB   (3 responses sent no content-length)
over budget     3
  - LCP 3180ms > 2500ms
  - CLS 0.142 > 0.1
  - JS 380kB > 250kB
```

Read the numbers together. LCP over budget with 960kB of images is one problem,
not three — see `performance`.

Two caveats the script prints for a reason:

- **These are lab numbers** on your machine's connection. Field data beats them.
  Use them as a regression guard, not as the truth about users.
- **Weight comes from `content-length`.** A response without that header is not
  counted, so this can read lower than your network tab. The count of unmeasured
  responses is shown so you know how much you are missing.

**INP is absent on purpose.** It needs a real interaction, and a fabricated zero
would be worse than no number.

## Retrofitting an existing project

Set the budgets to your **current** numbers, then ratchet down:

```json
{ "reviewPage": { "budgets": { "lcpMs": 3400, "cls": 0.15, "jsKb": 400, "totalKb": 1500 } } }
```

A budget set at the ideal on day one fails every build for something nobody in
that PR caused, and gets disabled within a week. A budget set at today's number
catches the next regression on the PR that caused it.

## In CI

Run it against a preview deploy or a built app, not a dev server — dev bundles are
not the numbers you ship. Upload the screenshots as artifacts; a failed run whose
screenshot you cannot see is a puzzle.

## When it will not run

| Symptom | Cause |
|---|---|
| `playwright is not installed` | `pnpm add -D playwright && pnpm exec playwright install chromium` |
| `could not launch a browser` | set `REVIEW_BROWSER_PATH` to an existing Chromium binary |
| `axe accessibility scan skipped` | `pnpm add -D @axe-core/playwright` — the rest still ran |
| `could not load <url>` | the app is not running, or `--base` is wrong |
| Every budget fails on an existing project | expected; set them to current numbers |
| Weight lower than the network tab | only `content-length` responses are counted |

The script degrades rather than failing: a missing axe package skips that one
check and says so. A run that reports "skipped" is not a pass for that check.

## Definition of done for a screen

- [ ] `review-page.mjs <route>` exits 0 at every configured width
- [ ] `review-page.mjs <route> --states` run
- [ ] Every screenshot opened and looked at, both widths, both modes
- [ ] Focus order read and judged sensible, not just non-empty
- [ ] Zero axe violations, or each one explained
- [ ] Budgets met, or the regression explained in the PR
