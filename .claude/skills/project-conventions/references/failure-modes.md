# Failure modes — what has actually gone wrong here

Generic standards encode what _usually_ goes wrong. This file encodes what has
gone wrong **in this codebase** — a far better predictor, and the only part of the
standards package you cannot download.

**Seeded rows.** The rows below recur across frontends. Keep the ones that can
happen here, delete the rest, and change the wording to match your vocabulary.
A row you keep is a claim that it can happen here.

**Add a row whenever something broke that a generic standard would not have
caught.** One line each, in the order it happened. Never delete a row because it
is fixed — the fix is why the row is useful.

| #   | What happened                                                                                                                                                                                                                          | Root cause                                                                                                                                                                                                                                                                                                                                                                   | What we do now                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | A failed request rendered "No items yet" and users thought their data was deleted                                                                                                                                                      | empty checked before error                                                                                                                                                                                                                                                                                                                                                   | error is checked first, always — `ui-states`                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2   | Users double-booked a slot by double-clicking Confirm                                                                                                                                                                                  | submit not disabled while in flight, no idempotency key                                                                                                                                                                                                                                                                                                                      | disable on submit; key generated at action time                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 3   | A contract field rename broke 14 components in one PR                                                                                                                                                                                  | the generated client was imported directly in components                                                                                                                                                                                                                                                                                                                     | only `lib/api/data/` imports it; `check-boundaries.mjs` enforces it                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 4   | A palette update left three screens with the old brand blue                                                                                                                                                                            | hex literals copied into components                                                                                                                                                                                                                                                                                                                                          | tokens only; raw hex fails the checker                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 5   | Keyboard users could not dismiss the booking modal                                                                                                                                                                                     | Escape unhandled; focus not trapped                                                                                                                                                                                                                                                                                                                                          | modal checklist in `accessibility`; focus trace in `review-page.mjs`                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 6   | A filter change did not update the result count above the list                                                                                                                                                                         | count derived from a separate query key that was not invalidated                                                                                                                                                                                                                                                                                                             | invalidate the subtree, not the single key                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 7   | Mobile layout broke at 390px for two weeks before anyone noticed                                                                                                                                                                       | nobody ran the review at phone width                                                                                                                                                                                                                                                                                                                                         | `review-page.mjs` runs at 390 and 1440 on every screen                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 8   | A 900kB hero image pushed LCP past 4s                                                                                                                                                                                                  | no dimensions, no modern format, not sized to the slot                                                                                                                                                                                                                                                                                                                       | image rules in `performance`; total-weight budget enforced                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 9   | Session data persisted after logout on a shared machine                                                                                                                                                                                | `localStorage` keys not enumerated and cleared                                                                                                                                                                                                                                                                                                                               | logout purges an explicit key list, caches, and IndexedDB                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 10  | An analytics event rename silently truncated every dashboard                                                                                                                                                                           | event renamed in place                                                                                                                                                                                                                                                                                                                                                       | never rename a live event; add, run both, migrate, remove                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 11  | A service worker served last week's shell against this week's API                                                                                                                                                                      | documents cached cache-first                                                                                                                                                                                                                                                                                                                                                 | documents are network-first; update prompt, no blind `skipWaiting`                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 12  | A form cleared every field when the server returned 422                                                                                                                                                                                | error handler reset the form                                                                                                                                                                                                                                                                                                                                                 | failure keeps every value; field errors map onto the same fields                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 13  | Search results from an abandoned query overwrote the current ones                                                                                                                                                                      | no request cancellation                                                                                                                                                                                                                                                                                                                                                      | `signal` passed through every query fn                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 14  | A "temporary" third-party tag was still collecting form fields two years later                                                                                                                                                         | no inventory of what runs                                                                                                                                                                                                                                                                                                                                                    | vendor seam plus a reviewed list of third-party scripts                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 15  | _(real, 2026-09-26)_ `next dev` appended its own block to the project `CLAUDE.md`                                                                                                                                                      | Next 16 generates agent rules into the repo root by default                                                                                                                                                                                                                                                                                                                  | `agentRules: false` in `next.config.ts`; check `git diff CLAUDE.md` after upgrading Next                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 16  | _(real)_ A production build called `file:///C:/Program Files/Git/api/mock/…` and hung on skeletons                                                                                                                                     | Git Bash rewrote `NEXT_PUBLIC_API_BASE_URL=/api/mock` into a Windows path at build time                                                                                                                                                                                                                                                                                      | build with `MSYS_NO_PATHCONV=1` (or from PowerShell/CI) when a value starts with `/`                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 17  | _(real)_ The built app never reached network idle, so `review-page.mjs` timed out                                                                                                                                                      | Next 16 holds `<Link>` prefetch streams open for routes that 404 (screens not built yet)                                                                                                                                                                                                                                                                                     | `prefetch={false}` on links to unbuilt routes (AppShell `PREFETCH`, MentorCard); flip back when those screens ship                                                                                                                                                                                                                                                                                                                                                                                                |
| 18  | _(real)_ `openapi-typescript` and `next build` type-checking crashed                                                                                                                                                                   | TypeScript 7 (native port) has no JS compiler API                                                                                                                                                                                                                                                                                                                            | TypeScript pinned to `~5.9` until the tooling supports 7                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 19  | _(real)_ ESLint crashed with `scopeManager.addGlobals is not a function`                                                                                                                                                               | ESLint 10 is ahead of `eslint-config-next`'s parser                                                                                                                                                                                                                                                                                                                          | ESLint pinned to `^9`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 21  | _(real, 2026-09-27)_ The phone match popover shipped a 32px fully-rounded CTA where the design has a 36px full-width radius-lg button; also popover padding, icon inset, pill shadow and hero line-height were off                     | built from the design-decisions prose and reused the pill's `.cta` class instead of reading the popover's own markup values                                                                                                                                                                                                                                                  | "Design conformance" rule in project-conventions: values from `.dc.html` only, no class reuse unless values match, computed-style table in every PR                                                                                                                                                                                                                                                                                                                                                               |
| 22  | _(real, 2026-09-27)_ PR #5 closed itself (unmerged) and CI kept failing on a field the code had                                                                                                                                        | #5 was stacked on #4's branch; deleting that branch on merge closes dependants. Separately, CI read a hand-copied spec secret that went stale when the spec gained `next_available_state`                                                                                                                                                                                    | Don't stack PRs, or retarget the dependant to `main` before merging its base. Spec is pulled from the backend's release each run (`pnpm spec:pull`); nothing is copied by hand. An overlay-in-a-secret/env var was tried and dropped: build config pasted into dashboards is fragile and unreviewable. Also: fast-forwarding a local branch from before the untrack commit deletes the ignored private files from disk — back them up (or `git fetch` + `git switch -C main origin/main` only after copying them) |
| 23  | _(real, 2026-09-27)_ PR #16 merged before CI ran on its last commit; separately CI failed on `main` fetching Google Fonts                                                                                                              | the merge loop waited for "any" green check, so it read the previous commit's result before GitHub registered the new push. The build fetched fonts from Google at build time (`next/font/google`)                                                                                                                                                                           | Wait for the checks of the exact head SHA before merging. Fonts are committed and self-hosted (`next/font/local`); builds need no network for fonts                                                                                                                                                                                                                                                                                                                                                               |
| 24  | _(real, 2026-09-27)_ A mentor's card said "Next available Wed, Sep 30, 1:30 am" but the booking modal opened on Mon, Sep 28                                                                                                            | Two independent sources for one fact: the card read `next_available_at` from the API while the modal's days were a separate Phase A mock ("tomorrow onward" for every mentor). Each looked right alone                                                                                                                                                                       | The modal reads the real `/users/{id}/availability/slots`; the mock API derives the card and the grid from one helper (`lib/api/mock/availability.ts`). A mock of a fact the UI shows twice must have one source. Days are grouped in the viewer's chosen zone (`utils/slots.ts`)                                                                                                                                                                                                                                 |
| 25  | _(real, 2026-09-27)_ CI `page-review` failed on every commit of the profile PR (#21) with "failed" requests to `/mentors/…?_rsc=…` from `/explore`, though the pages worked                                                            | Re-enabling `<Link>` prefetch on profile links: in production builds Next prefetches every card in view, answers 200, then cancels some streams (`net::ERR_ABORTED`) as it re-prefetches; `review-page` counts aborted requests as failures. The dev server doesn't prefetch, so local reviews were clean — and the first CI failure went unread                             | Profile links keep `prefetch={false}` (MentorCard, FeaturedMentor). Run `review-page` against a production build (`pnpm build && next start`) when changing links or prefetch, and read `page-review` on every PR commit before moving on                                                                                                                                                                                                                                                                         |
| 26  | _(real, 2026-09-27)_ From 470 to 767px the profile name and headline sat 36px inside the blue banner in dark text                                                                                                                      | The phone rules pulled the header row 36px into the banner and dropped the name block's top padding, assuming the name wraps below the avatar. It only wraps under ~470px (72px avatar + 320px name basis), so wider phones and small tablets kept it beside the avatar, inside the banner. `review-page` screenshots 390 and 1440 only, both on the right side of the break | Phone rules give `.intro` `flex-basis: 100%`, so the layout no longer depends on wrapping. `scripts/check-layout.mjs` (CI) asserts the name clears the banner at 390/600/767/768/1024; `reviewPage.widths` adds 600. A negative-margin overlap must not rely on content wrapping                                                                                                                                                                                                                                  |
| 27  | _(real, 2026-09-27)_ Every outlined button was grey (ink label, ink-300 hairline, white fill) while the design system draws them blue and transparent; found only when the new-mentor card was compared against a render of the design | The Button atom's `secondary-outlined` was written from memory in the first Explore commit, not from the DS component (`_ds_bundle.js` / `Button.prompt.md`), and no divergence row was logged, so nothing flagged it. Per-screen computed-style checks never measured button colour                                                                                         | Button values come from the DS component source, with a divergence row for any change. The fidelity pass compares every styled element against a local render of the design (colour included), not a hand-picked property list                                                                                                                                                                                                                                                                                    |
| 28  | _(real, 2026-09-27)_ Booking on a Vercel dev/preview deployment failed with "We couldn't send your request. We couldn't reach EduFurther." and a CORS error; browsing worked                                                           | That environment set `NEXT_PUBLIC_API_BASE_URL` to the backend, so the browser called it cross-origin; the backend's CORS allows only `Authorization`/`Content-Type`, and `POST /sessions` also sends `Idempotency-Key`, so the browser blocked it. `NEXT_PUBLIC_MOCK_VIEWER` also meant no token, so it would have been a 401 next                                          | README: keep `NEXT_PUBLIC_API_BASE_URL` unset on Vercel (same-origin proxy) and sign in for real to book. Backend asked to allow `Idempotency-Key` (with a preflight test)                                                                                                                                                                                                                                                                                                                                        |
| 20  | _(real)_ `review-page.mjs --states` screenshotted skeletons, not the error state                                                                                                                                                       | the query retries once before failing; the capture fires during the retry                                                                                                                                                                                                                                                                                                    | error/empty states are proven by component tests and Storybook stories, not only `--states`                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 29  | _(real, 2026-09-29)_ The edit form overflowed 34px sideways at 390, the create form didn't                                                                                                                                             | WizardSteps' hidden ", done" labels (`.sr-only`, absolutely placed) had no positioned ancestor inside the phone scroller, so they escaped its clipping and widened the page; only edit has done steps past the one on screen                                                                                                                                                 | a positioned element around any `.sr-only` inside an `overflow` container; review-page's overflow check on every route and state that adds hidden text                                                                                                                                                                                                                                                                                                                                                            |
| 30  | _(real, 2026-09-29)_ PR #78 (Mentor Profile) reverted #77's `is_featured` fixtures in four session-type files; CI went red and the session first blamed the other session's files                                                      | The branch was squashed with `git reset --soft origin/main` after `origin/main` had moved: a soft reset keeps the working tree, so stale copies of files changed on main became part of the commit. A stale local spec (git-ignored) let typecheck pass                                                                                                                      | Squash with `git rebase -i`-free steps that can't carry stale files: rebase onto `origin/main` first, then `git reset --soft $(git merge-base HEAD origin/main)`. Before pushing a squash, read `git diff --stat origin/main...HEAD` for files outside the PR. Re-pull the spec (`pnpm spec:pull && pnpm gen:api`) before trusting a local typecheck                                                                                                                                                              |

---

## How to add a row

Keep it to one line per column, and write the **root cause**, not the symptom.
"The modal broke" is not a root cause; "focus was never moved into the dialog" is.

The fourth column should name the standard, the check, or the rule that now
prevents it. If nothing prevents it yet, say so — that row is a to-do.
| 31 | _(real, 2026-09-29)_ The row's "Keep it" button was named "Keep it : SOP draft review" in Chrome; the unit test (jsdom) saw "Keep it: SOP draft review" and passed | The name was the visible text plus an `.sr-only` span; the browser's name computation treats the absolutely placed span as a block and inserts a space. jsdom doesn't | put the full name in `aria-label` when it adds to the visible label; the drive script's `getByRole` catches it. Explore's "View profile: {name}" (MentorCard, FeaturedMentor) had the same pattern, fixed the same way; so did WizardSteps' ", done". Only a fragment that starts with punctuation shows it (one starting with a space reads fine): TimezonePicker's ", change time zone" was the last, fixed the same way |
| 32 | _(real, 2026-09-29, review of #80)_ A row's failure message ("Couldn’t feature it…") was on screen but likely never read out | Each message was a `role="status"` paragraph inserted with its text already in it; NVDA, JAWS and VoiceOver often skip a live region that arrives full. Focus also fell to `<body>` when "Keep it" or a deleted row took the focused button with it | one always-present `LiveRegion` per screen carries every row message (the row's text is visual only); a control that removes itself moves focus on purpose (the switch after "Keep it", the next row's "⋯" or Create after a delete) |
| 33 | _(real, 2026-09-30, #85)_ CI's layout check failed ("topics are not below the buttons") on a change that passed the local gate | The chip list became `display: contents` (so "Edit topics" wraps with the chips); a box-less element measures 0×0, and `scripts/check-layout.mjs` read the list's box. The local gate never ran check-layout | The check measures the topics row. Run `node scripts/check-layout.mjs` (needs the build running) in the local gate whenever header or layout CSS changes |
| 34 | _(real, 2026-09-30, Chrome screen test)_ "Add education" opened with "current" ticked and "Replaces the one currently marked", although another degree was current | The new draft was made while the owner's list was still loading (no "other current" yet), and the seed on first load only ran for edits | A form's defaults that depend on loaded data are set when that data first arrives, not at mount; regression test in ProfileItemModal.test. The Chrome screen test caught what unit tests with ready data never exercised |
| 35 | _(real, 2026-09-30, #102; before that #81)_ CI's boundary check failed: "raw colour #102" in a test name | The raw-hex rule matches any `#` plus 3 or 6 hex digits, so a PR or issue number such as #102, #301 or #abc in a component's test name or comment reads as a colour | Write "PR 102" / "backend 301", not `#NNN`, in files under src/components; run `node scripts/check-boundaries.mjs` before every push |
| 36 | _(real, 2026-09-30, PR 112 screen test)_ Escape in the review's open session list closed the whole modal and dropped the typed review, although a unit test (with the real ModalShell) passed | In the app, Next hydrates React on `document`, so React's delegated listener and ModalShell's `document` keydown listener sit on the same node: `e.stopPropagation()` can't stop the second. In Testing Library, React's root is a `div` below `document`, so the same code passes | To keep a keypress from a `document` listener, call `e.nativeEvent.stopImmediatePropagation()` (React's root listener is registered first). A key-handling fix inside a modal needs a screen test in a real build: jsdom can't show this |
| 37 | _(real, 2026-09-30, reported by product on production)_ On every refresh, signed-in users saw the full-width wordmark header for a moment (seconds on a slow token refresh), then the sidebar replaced it and the page jumped 88px | The server couldn't know the session (read in the browser), so it rendered the "pending" chrome, which kept the old header; PR 111 made that state look unlike the member chrome. Page review never saw it: mock viewers are known at render time | The proxy hands the verified user id to the render (`x-ef-session`), the root layout seeds `useSession` with it, and the first paint has the member frame or the guest header. Check chrome changes with a real (non-mock) sign-in, or at least with the first HTML (`curl`) |
| 38 | _(real, 2026-10-03, Bookings PR 1, caught by driving the page)_ On a mentee's History, "Book again" appeared on a session they had **hosted**, and the Pending tab's intro addressed the wrong party | Both were chosen from `viewer.isMentor` — the account's role — but `/users/{id}/sessions` returns every session the user is a party to, **on either side**, so one account's list holds both kinds of row | A row's copy, actions and badges follow **`booking.side`** (derived per row from `mentor_id`/`mentee_id`), never the viewer's role. The viewer's role decides only what has no row to read from: an empty state, and whether booking is allowed at all. Regression tests in `BookingsScreen.test` |
| 39 | _(real, 2026-10-03, Bookings PR 1)_ `review-page --states` screenshotted the loading skeleton where the error state belonged, which read as a broken error state | The forced 500 is retried once by React Query, and the shot is taken before the retry settles, so `isPending` is still true. The code was correct | Prove an error state with a unit test that sets `error` directly; use `--states` for what it is good at (nothing crashes, no overflow, axe is clean). A skeleton in a `--states` shot is not by itself a bug |
| 40 | _(real, 2026-10-03, spotted by product on the merged screen)_ A Bookings list holding exactly one row drew square top corners inside a rounded box | `.row:first-child` and `.row:last-child` each set the **`border-radius` shorthand**. Both match the only row, equal specificity, so the later rule won the whole property and blanked the top corners. The design computes all four corners per row, so its own output never has the case | In a list whose ends are rounded by `:first-child`/`:last-child`, set **one corner at a time** (`border-top-left-radius`…), never the shorthand. A one-row list is a story (`BookingRow` → `OnlyRow`); check it whenever a list's ends are styled by position |
| 41 | _(real, 2026-10-03, Bookings PR 2 review)_ `{(actions || menu?.length) && …}` would render a bare **`0`** inside a row | An empty array’s `length` is `0`, which React renders as text rather than skipping, unlike `false`/`null`. Latent here only because the one caller always passes an item | Coerce a length test to boolean in JSX: `{(actions || !!menu?.length) && …}`. Any `&&` guard on `.length`, `.size` or a number in JSX needs the same |
| 42 | _(real, 2026-10-03, Bookings PR 2 review)_ The details panel’s reason heading read "This session cancelled this session" for a system actor | The verb table already contained the object ("cancelled this session"), and the system branch prefixed "This session" to it. Only `expired` and `no_show` had their own early returns | A sentence built from a name plus a verb needs a second, **passive** form for the actor that has no name ("This session was cancelled"). Covered for all three statuses in BookingDetails.test |
| 43 | _(real, 2026-10-03, spotted by product on the merged screen)_ Bookings' rows, hero and details panel kept their desktop padding on phones; the design tightens all of it | The design's phone rules live in `AppShell.dc.html`'s global `<style>` block, which we deliberately never port (it overrides by attribute-substring selectors). Handoff §7.3 asks for the same rules as per-component CSS at 768px, and other screens do it — Bookings just never did. **The fidelity check did not catch it because every measurement was taken at 1440px** | Read that block when porting a screen and reimplement the rules it would have hit per component (`--space-5`→`--space-4`; `--space-4 --space-5`→`--space-3 --space-4`; `--space-3 --space-4`→`--space-2 --space-3`; `gap --space-6`→`--space-4`). Measure computed styles at **390px as well as 1440px** before a PR |
| 44 | _(real, 2026-10-08, Session Join PR 3's CI)_ The calendar menu's keyboard test failed on CI once, passing locally and on every earlier run | `RowMenu` focuses its first item on the next animation frame, after the menu renders; the test awaited the item's *existence* (`findByRole`) and checked focus at once, so a slow runner checked before the frame | Await the focus itself: `await waitFor(() => expect(item).toHaveFocus())`. Any test of a RowMenu-based menu (row menus, the photo menu, Add to calendar) does the same |

### #44 — A "mitigation" the element does not support

Rendering another user's uploaded PDF, I wrote `<object>` with a comment saying
it was sandboxed. `<object>` has no `sandbox` attribute, and a sandboxed
`<iframe>` cannot load a `blob:` URL without `allow-same-origin`, which hands
the origin straight back. The comment would have been read by the next person,
and by a reviewer, as a control that was in place.

Headless Chromium has no PDF viewer, so the empirical test came back identical
for every sandbox value — inconclusive, not reassuring.

**Check:** before writing a comment that names a security control, confirm the
element actually supports it. If the real containment belongs to the browser,
say that it is the browser's and not ours.

### #45 — A mock that makes a correct screen look broken

The answers mock reused `booking_message` as the first answer's text, so the
hero and the panel showed the same sentence twice. The code was right; the
fixture made it look like a duplication bug. Found by looking at the page in a
real browser, not by any test.

**Check:** fixtures for two independent fields get visibly different content.

### #46 — Two dialogs, one Escape

The Bookings details panel is itself a dialog below 1100px. Opening the intake
file viewer on top of it gave two `useFocusTrap`s listening on `document`, so a
single Escape ran both handlers: the viewer closed *and* the panel closed,
dropping `?booking=` and losing the user's place. The scroll lock had the same
shape — the inner dialog closing restored `body` overflow while the outer one
was still open.

The first fix was a mount-ordered stack, and it was wrong: React runs a child's
effect **before** its parent's, so two dialogs opening in one commit register
inside-out and the "last pushed" is the outermost. Document order is the signal
that holds for both nesting and portalled siblings.

**Check:** before adding a second dialog anywhere, ask what `document`-level
listeners already exist. Mount order is not nesting order.

### #47 — A query function is not a safe place for a side effect either

Moving `createObjectURL` out of `useMemo` and into the query function fixed the
render-phase leak but not the problem: with `gcTime: 0`, StrictMode's double
mount collects the first attempt and refetches, so a URL is minted that no
render ever observes and no cleanup can reach. Only tracking every URL minted
*per file* and releasing them together actually closes it.

**Check:** when a resource needs explicit release, the thing that creates it and
the thing that frees it must be reachable from each other. "Create it somewhere
that runs less often" is not the same as pairing them.

### #48 — A wrapping flex row puts the corner control wherever it likes

The ⋯ was grouped with the row's actions, which deliberately take their own
full-width line on a phone. With no actions in the row, the menu went with them
and landed under the card — reported from a real phone-width view, not by any
check. `review-page` was clean at 390px throughout: nothing it measures objects
to a control being in the wrong place.

The fix also needed `.content` to take a zero flex basis, because a 240px basis
made the first line too wide and wrapped the ⋯ even after it was separated.

**Check:** a control the design pins to a corner does not belong in a flex group
that is allowed to wrap. And a screenshot at phone width is not optional because
the automated page review passed.

### #49 — Gating a whole element on an attribute that is now conditional

Making `aria-controls` conditional on the panel existing, I used the same value
to decide whether to render the preview box at all — so the box disappeared
whenever the panel was closed, which is almost always. One test caught it.

**Check:** when a prop becomes optional, look at every condition that reads it.

### #50 — A gate copied from the wrong sibling

The row offers "See all N answers" only when `count > 1`, because the row
already shows the first one. I gave the hero the same gate — but the hero shows
*no* answers, so a mentee who answered exactly one question had their whole form
hidden on the most prominent booking on the screen. The design had it right and
I did not read it closely enough: its hero link is gated on answers being on at
all, not on a count.

**Check:** when two consumers share a component, check each gate against what
that consumer actually displays, not against the other consumer.

### #51 — An accessible name that trims itself apart

Adding the booking to a button's name as `<span class="sr-only"> for {name}</span>`
produced "See all 4 answersfor Visa practice": JSX drops a leading space in a
text node, and accessible-name computation trims each node before joining, so
putting it back inside the expression did not help either. `aria-label` with the
whole string is the reliable form.

**Check:** assert the computed accessible name in a test, not the markup.

### #52 — A design variant the atom silently did not have

I built Accept as a filled primary and Decline as an outlined button. The design
says `secondary-outlined` and `text-destructive`. The second did not exist on our
Button atom at all — it is in the DS bundle, but was never ported — so there was
nothing to fail, and a plausible-looking pair of buttons shipped straight past a
reading of the markup.

**Check:** when the design names a DS variant, confirm the atom actually has
that variant before using "the closest one". A missing variant is not a type
error.

### #53 — Two live regions, one query

`getByRole('status')` matched both the page's own `sr-only` live region and the
new Notice, and the test failed on ambiguity rather than on the behaviour. The
fix is to assert the words, not the role.

**Check:** on a screen that already has a live region, query new status content
by its text.

### #54 — A stale mirror reads exactly like a design that does not exist

A parallel build was told to read `SuggestTime.dc.html`, found it absent from
the local design mirror, and correctly reported "the design draws nothing here"
— then invented the component and recorded the divergence. The file exists in
the design project; only the mirror was out of date. The record was false and
had to be corrected, and the invented half had a specification all along.

**Check:** before recording that something is undrawn, list the design project
itself rather than the mirror. The mirror is a cache, and nothing about a
missing file says whether it was never drawn or merely never pulled.

### #55 — A link I never followed

"Book this time" pushed `/mentors/{id}?at={instant}`. **Nothing reads `at`.** The
profile understands `?book={sessionTypeId}` and `?tab=`, and nothing else — so
the one action the whole mentee-side feature exists for landed them on a profile
with the flow closed, the held time unfound, and a stray parameter left in the
URL to be shared along with it. "Leave a review" had the same shape: it linked
to `?tab=reviews`, and that tab did not exist for a mentor with no reviews yet —
precisely the mentor the mentee was being sent to review.

Both were written as if the destination already understood the link. Neither was
followed.

**Check:** after writing a link, open it. A URL parameter is a contract with the
page at the other end, and nothing fails loudly when that page ignores it.

### #56 — "Show everything" is not a design for real data

"Pick another day" revealed every remaining slot. With a month of open hours
that is forty-eight chips, 1240px of them, pushing the dialog's own buttons
roughly 900px below the fold on a phone. The fixture had three.

The label was wrong too: it did not pick a day, it expanded a list — the name
was inherited from the design's month-picker modal, which was the thing that
would have prevented the pile-up.

**Check:** size a list against the data the product will really have, not the
fixture. And when a design's affordance is skipped, do not keep its label.

### #57 — Copy that concludes from a failed read

When the slots read failed, the step said "…so there's nothing to offer here."
It could not see the mentor's times, so it had no basis for saying whether there
were any — a mentor with a full calendar was told there was nothing. The earlier
round had already split "no open times" from "could not load", and still the
second branch kept the first's conclusion.

**Check:** a failure may describe itself. It may not draw the conclusion the
success path would have drawn.

### #58 — A dedupe key built from a CSS-module class name

**2026-10-03, /login.** The report said "focus order 3 stop(s)" and stopped at
"Continue with email" — the Google button and the switch link below it were
never traced, at any width. The page was fine: tabbing by hand reaches both,
each with the blue ring.

The tracer ends the walk when a stop's key repeats, taking that as the tab order
having wrapped. The key is
`tagName:id:className.slice(0, 40)` — and two `Button` atoms have no id and CSS
module class strings whose **first 40 characters are identical**
(`Button-module__<hash>__button Button-modu…`). The second button looks like the
first coming round again.

**Check:** a dedupe key built from a class name is a key built from whatever the
bundler happened to emit. Anything that identifies a focus stop must include
what makes it that stop — here, its accessible name. Until this is fixed, a
3-stop report on a page you know has more is the tracer, not the page: confirm
by hand before believing it.

### #59 — A cause named where the code cannot tell causes apart

The consent copy said "The Google window closed before access was granted." The
mentor may instead have clicked past Google's calendar checkbox, which sits a
step after the account screen — and from here the two are indistinguishable:
both leave the grant absent and our poll waiting. The backend's own docstring
had the same shape the same day, claiming `last_error` carried "Google's words"
when the two values it can hold are the backend's own constants. Neither was a
guess about something checkable; both were plausible stories told in the voice
of an observation, and the specificity is what made them convincing.

Related to #57, and narrower: that one drew a success-path conclusion from a
failed read. This one picks one cause out of a set the code cannot separate.

**Check:** when copy or a comment states a cause, ask whether the code could
distinguish it from its neighbours. If it cannot, name the set. "The window
closed, or the calendar permission wasn't ticked" is uglier than either single
sentence and is the only one that is true.

### #58 — A comment that outlived the thing it described

Four places said the question wording was "as it reads now (backend #350)" and
that a mentor rewording a question silently relabels old answers. That stopped
being true when #360 merged. Nothing failed: a stale comment compiles, passes,
and is believed — and three of these were in `types/booking.ts`, which seven
components import.

**Check:** when a backend ticket you cited closes, grep for its number. A
comment naming an issue is a claim with an expiry date.

### #59 — One rule, five copies of its number

"12 hours" existed in `refundOnCancel`, the cancel dialog's copy, the details
panel's record of a past cancellation, the Session Join prep tip, and the
credits refund policy. Five independent literals, nothing linking them. When
backend #413 made the window deployment configuration, every one of them was
wrong with nothing failing.

**Writing the number was not the mistake.** Twelve was a fixed product rule and
spelling it out is clearer than "well in advance". The mistake was five copies:
with one source the four readers would have been right while it was fixed, and
one line would have changed when it stopped being.

A second, smaller thing: the fix is to read the server's `refund_until` and
derive the sentence from it, so the copy cannot disagree with the rule it
describes. The mock runs a **10**-hour window on purpose — at twelve a hard
literal is correct by coincidence in dev and wrong in production.

**Check:** when the same fact appears in a second place, give it one source
then, not when it changes. And the first instinct on scope — "that other one is
somebody else's area" — draws the line around the screen rather than around the
change; the owner caught that here.

### #60 — A stub typed `unknown` hid a new required field

`BookingsScreen.test.tsx` mocks the answers hook as
`{ data: unknown; ... }`. When `answered` was added to `BookingAnswer`, the
compiler checked every other construction site and missed this one, because
`unknown` accepts anything. The fixtures kept compiling with the field absent,
`!a.answered` read `undefined` as falsy, and **every answer in that suite
rendered as "No answer"** — the exact inversion of the feature.

Three tests failed, which is how it was caught. Had they asserted less
precisely, a green suite would have described a screen that showed no answers
at all.

**Check:** a mock's payload type is part of the contract. `unknown` or `any` on
a stub buys nothing and removes the one mechanism that finds every site when a
field is added. Type the stub with the real domain type.

### #61 — Reading a gate's tail instead of its exit code

`check-boundaries.mjs` ends every run, pass or fail, with the same closing
line: "The one worth keeping strict from day one is client-import." Piping it
to `tail -1` therefore prints that line whether it found three violations or
none. It was reported as clean twice, and the failure reached CI.

The violations were ticket references: `#412` inside a `describe()` title under
`src/components/` is a valid three-digit hex. The checker strips **comments**
before the hex scan, which is why `#409` in a comment has always been fine and
the same text in a string literal is not. The fix was to move the reference
into a comment, where the rest of the codebase already keeps them — not to add
the files to `allowRawHex`, which would have blinded the check to real colours.

**Check:** judge a gate by its exit code, never by its last line of output.
`cmd; echo "EXIT=$?"` or `cmd && echo ok`. A tail is not a verdict, and a
summary line that is printed unconditionally is not a result.

### #62 — An exemption added to the rule but not to the label

Making the cancellation reason required came with one exemption: a mentor who
offers another time instead has already explained themselves. The exemption
went into the submit guard — and `required` was still passed to the field
unconditionally. So that mentor saw "Why?" with no "Optional" beside it,
picking "Something else" relabelled the note "What happened?" and put a native
`required` on the textarea, and the confirm went through empty regardless.

Nothing failed. Every test passed, because each one tested one side: the guard
waives it, the field marks it. The contradiction only exists between them.

**Check:** when a required-ness has an exemption, derive the label and the
guard from **one** value, in one place. Two reads of the same condition drift
the moment one of them gains a case. And a field marked required that submits
empty is worse than one never marked: it teaches people the marking is noise,
on every other form in the product too.
