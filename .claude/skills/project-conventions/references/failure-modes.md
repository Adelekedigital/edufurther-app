# Failure modes — what has actually gone wrong here

Generic standards encode what *usually* goes wrong. This file encodes what has
gone wrong **in this codebase** — a far better predictor, and the only part of the
standards package you cannot download.

**Seeded rows.** The rows below recur across frontends. Keep the ones that can
happen here, delete the rest, and change the wording to match your vocabulary.
A row you keep is a claim that it can happen here.

**Add a row whenever something broke that a generic standard would not have
caught.** One line each, in the order it happened. Never delete a row because it
is fixed — the fix is why the row is useful.

| # | What happened | Root cause | What we do now |
|---|---|---|---|
| 1 | A failed request rendered "No items yet" and users thought their data was deleted | empty checked before error | error is checked first, always — `ui-states` |
| 2 | Users double-booked a slot by double-clicking Confirm | submit not disabled while in flight, no idempotency key | disable on submit; key generated at action time |
| 3 | A contract field rename broke 14 components in one PR | the generated client was imported directly in components | only `lib/api/data/` imports it; `check-boundaries.mjs` enforces it |
| 4 | A palette update left three screens with the old brand blue | hex literals copied into components | tokens only; raw hex fails the checker |
| 5 | Keyboard users could not dismiss the booking modal | Escape unhandled; focus not trapped | modal checklist in `accessibility`; focus trace in `review-page.mjs` |
| 6 | A filter change did not update the result count above the list | count derived from a separate query key that was not invalidated | invalidate the subtree, not the single key |
| 7 | Mobile layout broke at 390px for two weeks before anyone noticed | nobody ran the review at phone width | `review-page.mjs` runs at 390 and 1440 on every screen |
| 8 | A 900kB hero image pushed LCP past 4s | no dimensions, no modern format, not sized to the slot | image rules in `performance`; total-weight budget enforced |
| 9 | Session data persisted after logout on a shared machine | `localStorage` keys not enumerated and cleared | logout purges an explicit key list, caches, and IndexedDB |
| 10 | An analytics event rename silently truncated every dashboard | event renamed in place | never rename a live event; add, run both, migrate, remove |
| 11 | A service worker served last week's shell against this week's API | documents cached cache-first | documents are network-first; update prompt, no blind `skipWaiting` |
| 12 | A form cleared every field when the server returned 422 | error handler reset the form | failure keeps every value; field errors map onto the same fields |
| 13 | Search results from an abandoned query overwrote the current ones | no request cancellation | `signal` passed through every query fn |
| 14 | A "temporary" third-party tag was still collecting form fields two years later | no inventory of what runs | vendor seam plus a reviewed list of third-party scripts |
| 15 | *(real, 2026-09-26)* `next dev` appended its own block to the project `CLAUDE.md` | Next 16 generates agent rules into the repo root by default | `agentRules: false` in `next.config.ts`; check `git diff CLAUDE.md` after upgrading Next |
| 16 | *(real)* A production build called `file:///C:/Program Files/Git/api/mock/…` and hung on skeletons | Git Bash rewrote `NEXT_PUBLIC_API_BASE_URL=/api/mock` into a Windows path at build time | build with `MSYS_NO_PATHCONV=1` (or from PowerShell/CI) when a value starts with `/` |
| 17 | *(real)* The built app never reached network idle, so `review-page.mjs` timed out | Next 16 holds `<Link>` prefetch streams open for routes that 404 (screens not built yet) | `prefetch={false}` on links to unbuilt routes (AppShell `PREFETCH`, MentorCard); flip back when those screens ship |
| 18 | *(real)* `openapi-typescript` and `next build` type-checking crashed | TypeScript 7 (native port) has no JS compiler API | TypeScript pinned to `~5.9` until the tooling supports 7 |
| 19 | *(real)* ESLint crashed with `scopeManager.addGlobals is not a function` | ESLint 10 is ahead of `eslint-config-next`'s parser | ESLint pinned to `^9` |
| 21 | *(real, 2026-09-27)* The phone match popover shipped a 32px fully-rounded CTA where the design has a 36px full-width radius-lg button; also popover padding, icon inset, pill shadow and hero line-height were off | built from the design-decisions prose and reused the pill's `.cta` class instead of reading the popover's own markup values | "Design conformance" rule in project-conventions: values from `.dc.html` only, no class reuse unless values match, computed-style table in every PR |
| 22 | *(real, 2026-09-27)* PR #5 closed itself (unmerged) and CI kept failing on a field the code had | #5 was stacked on #4's branch; deleting that branch on merge closes dependants. Separately, CI read a hand-copied spec secret that went stale when the spec gained `next_available_state` | Don't stack PRs, or retarget the dependant to `main` before merging its base. Spec is pulled from the backend's release each run (`pnpm spec:pull`); nothing is copied by hand. An overlay-in-a-secret/env var was tried and dropped: build config pasted into dashboards is fragile and unreviewable. Also: fast-forwarding a local branch from before the untrack commit deletes the ignored private files from disk — back them up (or `git fetch` + `git switch -C main origin/main` only after copying them) |
| 23 | *(real, 2026-09-27)* PR #16 merged before CI ran on its last commit; separately CI failed on `main` fetching Google Fonts | the merge loop waited for "any" green check, so it read the previous commit's result before GitHub registered the new push. The build fetched fonts from Google at build time (`next/font/google`) | Wait for the checks of the exact head SHA before merging. Fonts are committed and self-hosted (`next/font/local`); builds need no network for fonts |
| 24 | *(real, 2026-09-27)* A mentor's card said "Next available Wed, Sep 30, 1:30 am" but the booking modal opened on Mon, Sep 28 | Two independent sources for one fact: the card read `next_available_at` from the API while the modal's days were a separate Phase A mock ("tomorrow onward" for every mentor). Each looked right alone | The modal reads the real `/users/{id}/availability/slots`; the mock API derives the card and the grid from one helper (`lib/api/mock/availability.ts`). A mock of a fact the UI shows twice must have one source. Days are grouped in the viewer's chosen zone (`utils/slots.ts`) |
| 25 | *(real, 2026-09-27)* CI `page-review` failed on every commit of the profile PR (#21) with "failed" requests to `/mentors/…?_rsc=…` from `/explore`, though the pages worked | Re-enabling `<Link>` prefetch on profile links: in production builds Next prefetches every card in view, answers 200, then cancels some streams (`net::ERR_ABORTED`) as it re-prefetches; `review-page` counts aborted requests as failures. The dev server doesn't prefetch, so local reviews were clean — and the first CI failure went unread | Profile links keep `prefetch={false}` (MentorCard, FeaturedMentor). Run `review-page` against a production build (`pnpm build && next start`) when changing links or prefetch, and read `page-review` on every PR commit before moving on |
| 26 | *(real, 2026-09-27)* From 470 to 767px the profile name and headline sat 36px inside the blue banner in dark text | The phone rules pulled the header row 36px into the banner and dropped the name block's top padding, assuming the name wraps below the avatar. It only wraps under ~470px (72px avatar + 320px name basis), so wider phones and small tablets kept it beside the avatar, inside the banner. `review-page` screenshots 390 and 1440 only, both on the right side of the break | Phone rules give `.intro` `flex-basis: 100%`, so the layout no longer depends on wrapping. `scripts/check-layout.mjs` (CI) asserts the name clears the banner at 390/600/767/768/1024; `reviewPage.widths` adds 600. A negative-margin overlap must not rely on content wrapping |
| 27 | *(real, 2026-09-27)* Every outlined button was grey (ink label, ink-300 hairline, white fill) while the design system draws them blue and transparent; found only when the new-mentor card was compared against a render of the design | The Button atom's `secondary-outlined` was written from memory in the first Explore commit, not from the DS component (`_ds_bundle.js` / `Button.prompt.md`), and no divergence row was logged, so nothing flagged it. Per-screen computed-style checks never measured button colour | Button values come from the DS component source, with a divergence row for any change. The fidelity pass compares every styled element against a local render of the design (colour included), not a hand-picked property list |
| 28 | *(real, 2026-09-27)* Booking on a Vercel dev/preview deployment failed with "We couldn't send your request. We couldn't reach EduFurther." and a CORS error; browsing worked | That environment set `NEXT_PUBLIC_API_BASE_URL` to the backend, so the browser called it cross-origin; the backend's CORS allows only `Authorization`/`Content-Type`, and `POST /sessions` also sends `Idempotency-Key`, so the browser blocked it. `NEXT_PUBLIC_MOCK_VIEWER` also meant no token, so it would have been a 401 next | README: keep `NEXT_PUBLIC_API_BASE_URL` unset on Vercel (same-origin proxy) and sign in for real to book. Backend asked to allow `Idempotency-Key` (with a preflight test) |
| 20 | *(real)* `review-page.mjs --states` screenshotted skeletons, not the error state | the query retries once before failing; the capture fires during the retry | error/empty states are proven by component tests and Storybook stories, not only `--states` |
| 29 | *(real, 2026-09-29)* The edit form overflowed 34px sideways at 390, the create form didn't | WizardSteps' hidden ", done" labels (`.sr-only`, absolutely placed) had no positioned ancestor inside the phone scroller, so they escaped its clipping and widened the page; only edit has done steps past the one on screen | a positioned element around any `.sr-only` inside an `overflow` container; review-page's overflow check on every route and state that adds hidden text |

---

## How to add a row

Keep it to one line per column, and write the **root cause**, not the symptom.
"The modal broke" is not a root cause; "focus was never moved into the dialog" is.

The fourth column should name the standard, the check, or the rule that now
prevents it. If nothing prevents it yet, say so — that row is a to-do.
