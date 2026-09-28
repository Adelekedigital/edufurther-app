# Design divergence

Every deliberate difference between the design source and the build. Silent
divergence is how a codebase and a design system drift until neither is trusted.

Add a row **when you make the choice**, not at review. See `design-sync`.

Design source: claude.ai/design project `fb0b8ef2…` (Explore.dc.html, MentorCard.dc.html,
BookingModal.dc.html, Modal.dc.html, AppShell.dc.html) and `Design decisions.md`.
Backend contract: `docs/handoff/explore-backend-reply.md`.

| Design says | We do | Why | Revisit when |
|---|---|---|---|
| MentorCard "Plus" gold tag | Not rendered | Backend has no Plus concept (reply #5) | backend defines Plus |
| MentorCard price line: "Free mentorship available" / "Paid sessions from $X" | Free line shown for every mentor; paid line deferred | Product (2026-09-27): all sessions are free until paid ships. No price data in the API yet (backend reply #3) | backend adds a price summary / paid sessions ship |
| MentorCard "No open times in the next 2 weeks" | "No open times at the moment" (same icon and style); Book reads "See availability" | Product (2026-09-27): the booking horizon is not always 2 weeks | a fixed product-wide horizon |
| "New to EduFurther" whenever there are no reviews | Only at 0–2 sessions; otherwise "No reviews yet · N sessions" | no reviews ≠ new (reply #6) | design confirms copy (design request #15) |
| Empty state "No mentors match all of that" / "Try removing a topic or two" | "No mentors match that" + ANY-of copy (provisional) | Topics match ANY-of (revised reply #1) — more chips widen results | design answers request #13 |
| No-mentors state with "Notify me" | Button hidden; the sentence promising it dropped | Nothing stores the request; notify is signed-in only (reply, notify section) | notify endpoint ships |
| BookingModal payment step, price tile | No payment step; Length tile only | No prices in the system | payments ship |
| BookingModal "{time} is on hold. X usually replies within 12 hours" | "{time} is on hold." | Reply time is not a real figure anywhere | backend exposes a response-time stat |
| Modal closes on backdrop click | Closes on ×, Escape, Cancel — not the backdrop | Booking holds typed answers and an uploaded file | never |
| Guest "Continue with Google" with a drawn G mark | Text-only dark button | The mark is a raw-hex drawing; DS `Google2` icon not ported yet | Icon atom ports DS brand glyphs |
| DS disabled solid button: white on `--ink-300` | `--ink-600` on `--ink-100` | Our disabled buttons carry the reason ("Booking needs a connection"); ~1.5:1 was unreadable | DS publishes a readable disabled token |
| DS outlined disabled label `--ink-400` | `--ink-500` | Readability, same reason | same |
| DS `--text-placeholder` `--ink-400` (2.58:1) | `--ink-500` via ours.css | WCAG 1.4.3 (DS readme lists it as a known failure) | DS fixes the token |
| DS inputs focus with a 2px orange ring | 2px `--border-focus` (blue-500) | Orange is banned in product UI; one focus ring app-wide | never |
| AppShell account menu + notifications bell | Not rendered | No auth yet; the controls would be dead | auth (phase B) |
| AppShell mobile `<style>` override block | Per-component responsive CSS at 768px | Handoff §7.3 asks for this | never |
| Explore hero sub (product chat copy) | Design's latest: "…Explore free 1:1 mentorship sessions." | Product's version promised paid sessions, which don't exist | product/design settle it (design request #18) |
| Match prompt "Find my mentor matches" → onboarding goals (undesigned) | External Cal booking link, opens in a new tab | Product decision; goals/onboarding not built | matching moves on-platform |
| Match prompt for mentees with ≤ 2 sessions | Mock viewer has 0 sessions until auth | No signed-in viewer yet | auth (phase B) |
| Account menu (rail avatar + menu; More sheet on phones) | Built to AppShell.dc.html; "Find my mentor matches" links to the Cal page (hidden when unset) | — | — |
| Account menu "View profile", "Feedback" | Not rendered | No mentee profile or feedback screen/destination yet | those screens ship |
| Header "Notifications" bell (signed in) | Not rendered | No notifications backend | notifications ship |
| No standalone Log in / Sign up screen in the design | `/login`, `/signup`: centred card with the booking modal's sign-up step (email) + a 6-digit code step | Needed for the header links; PROVISIONAL | design answers request #19 |
| Sign-up step "Continue with Google" | Not rendered | Backend: Google sign-in is work in progress | backend enables it |
| The viewer's own card on Explore (approved mentor) | Card shown without a Book button | Nobody books themselves; interim until the backend leaves the caller out of /mentors | backend self-exclusion ships |
| Signed in, no backend account (`/me` 404) | Info notice on Explore: "Your account isn’t ready yet…" (PROVISIONAL) | No self-signup yet | product decides account creation |
| Featured card button "Book session with Oluchi" (surname) | "Book session with {first name}" | Matches every other Book label; design sample used split[1] | never |
| Featured card secondary text `--ink-500` on `--blue-50` | `--ink-600` inside the card | ~4.2:1 fails AA on the blue ground (axe, page review) | design picks a token for text on blue-50 |
| Page size 24 (Design decisions §3) | 10 per page | Product (2026-09-27): quick to scan, "Show more mentors" for the rest | product revisits |
| Explore page `max-width:1120px` | `calc(2 * 493px + 16px)` = 1002px | Product (2026-09-27): Figma card max width is 493px; at 1120 two cards grew to ~552px and photos dominated. Hero, featured and filters share the width so edges align | design adopts (request #23) |
| Explore section `gap:var(--space-6)` (24px), phones 16px | `--space-8` (32px), phones `--space-6` (24px) | Product (2026-09-27): hero → featured → "What do you need help with?" read cramped | design adopts (request #23) |
| Featured image `flex:1 1 260px; min-height:220px` | 400px wide, card 315px tall; stacks full-width below 900px | Figma values (product 2026-09-27) | design adopts (request #23) |
| Photo `object-position:50% 25%` fixed | Anchored on the face when the backend sends `avatar_focus` (`var(--photo-x, 50%) var(--photo-y, 25%)`), design default otherwise | Product (2026-09-27): fixed crops cut faces; backend PR #240 detects the face | — (design's value remains the fallback) |
| MentorCard photo `aspect-ratio:3 / 2`, card `border:1px` | Photo `aspect-ratio:445 / 300`; card stroke as `inset` box-shadow (Figma stroke-inside), so the photo is exactly 445 × 300 in the 493px card | Figma values (product 2026-09-27) | design adopts (request #26) |
| MentorCard `padding:var(--space-4)` (16px) | `--space-6` (24px), skeleton too | Figma has 24px; the .dc.html lags it (product 2026-09-27) | design adopts (request #23) |
| Featured card text column: `gap:var(--space-2)`, top-aligned, `padding:var(--space-5) var(--space-6)`, name `--text-p-lg`, no offer line | Centred, 12px between groups (name+degree 4px), 32px padding, name `--text-h6` (20px), MentorCard's offer + availability block, CTA 4px lower | Product (2026-09-27): the 315px card looked sparse and top-heavy | design adopts (request #25) |
| Button sizes and variants | Built to CTA Hierarchy.dc.html (replaces the one-size #28 rule): large 48 / medium 40 / small 32 by placement, one filled button per view. The green "Find my mentor matches" buttons (prompt, pill, popover) are small 32 | Design + product (2026-09-27); match buttons: product, design request #41 | design maps the match buttons (#41) |
| Selected day tile weekday `--ink-500` on `--blue-50` (4.28:1 at 10px) | Superseded by the week view below: the weekday takes the tile's text colour (`--text-primary`), as the profile card draws it | WCAG 1.4.3; design request #29 | design answers #29 |
| BookingModal days: every day with slots (desktop grid; phone sheet: sideways 68px strip with slot counts) | **7 days at a time, starting today**, with the profile card's week switcher ("Next 7 days · Sep 27 – Oct 3", ‹ ›, 28px arrows) across the 4-week horizon; all 7 tiles shown, empty days disabled, a green dot on open days, day number only; 3-column time grid. Same on phones (44px arrows and times, day heading shown) | Product (2026-09-27): "the next 7 days of availability are to be shown"; always opens on this week | design adopts in BookingModal.dc.html (request #40) |
| BookingModal footer note "{time} · {first} confirms within 12 hours" | Resolved by design reply #30: "{time} · You'll get an email when {first} replies" (and the done state) | — | — |
| BookingModal phone sheet "Continue with Google" drawn 44px | Medium 40px with the invisible 44px tap area | CTA hierarchy rule 5 (medium keeps its drawn height on phones) | design redraws the sheet's Google button |
| Mentor Profile "Degree verified by EduFurther" tick next to the name | Not rendered | No verification concept exists anywhere in the backend (profile reply #8) | backend verifies degrees |
| Mentor Profile header "Message" button | Not rendered | No messaging yet | messaging ships |
| Mentor Profile Reviews tab, rating link to it | Not in PR 1 (tabs are Overview and Sessions); the header rating is plain text | Built in profile PR 2 | PR 2 |
| Mentor Profile "Similar mentors" card | Not rendered | Endpoint shipped after PR 1 (profile reply update 2, #9) | a follow-up PR |
| Mentor Profile in-card booking (date tiles, week switcher, time grid, in-card "Request sent") | Resolved by design reply #32: the card is header, description, outlined "Book this session" and "You'll pick a time and answer a few questions next."; every Book opens the shared BookingModal | Product (2026-09-27): one booking experience everywhere; design adopted | — |
| Mentor Profile per-offering "Free Mon, Sep 28" (booking card rows, Sessions tab cards) | Hidden; the Sessions card's Book keeps the right-hand place | Availability is stored per mentor, not per offering (profile reply #10) | never, unless the backend adds it |
| Mentor Profile "Top-rated" badge in the track record | Not rendered | No product rule for "Top-rated" yet | product defines it (design request #33) |
| Mentor Profile "Mentees keep coming back" line on every profile | Only when sessions ÷ mentees rounds above 1.0 | Otherwise the sentence is false | never |
| Mentor Profile scholarship "Fully funded" badge | Not rendered | The API has no funding field | backend adds one |
| Mentor Profile share menu "Copy link page" | Not offered | Link pages don't exist | link pages ship |
| Mentor Profile social chip YouTube mark (DS `Youtube2`) | Material `smart_display` glyph (LinkedIn `work`, X `alternate_email`) | DS brand glyphs not ported (same as the Google G) | Icon atom ports DS brand glyphs |
| Mentor Profile owner banner with a "View as mentee" toggle | The design's banner copy and lock icon (reply #35) without the toggle | Editing ships in later PRs; the toggle only means something with an edit mode | owner PRs |
| Mentor Profile social chip 32px, "Show more" link | 44px on phones | Touch targets (ours) | never |
| Mentor Profile loading / error / not-found | Built to design reply #34 (copy and layout) | — | — |
| Mentor Profile track record: four stats, all known | An unknown figure (attendance before a settled session) keeps its tile with a muted "No data yet" | A dropped tile left a hole in the 2×2 grid (product 2026-09-27) | design confirms styling (request #43) |
| Mentor Profile header, stacked (under 768px): avatar, intro, **actions, then topics** | Avatar, intro, **topics, then actions**; from 768px CSS order keeps the drawn layout | Product (2026-09-27): expertise before the calls to action once the header stacks | design adopts (request #46) |
| Mentor Profile avatar `align-items: flex-end` with the intro (desktop) | Pinned 10px into the banner (`align-self: flex-start; margin-top: 38px`). With no headline the intro is shorter than the pinned photo, so the header is ~23px taller than flex-end would draw it | With flex-end the photo slid below the banner whenever the intro ran to three lines (the design's own sample does it at 1024px) (product 2026-09-27) | design adopts (request #47) |
| Mentor Profile proof line wraps with a leading "·" (tablet) | Under 1024px the location takes its own line with no dot, as on phones | A wrapped separator led the new line (product 2026-09-27) | design adopts (request #47) |
| Mentor Profile rating tile: five gold stars at any rating | Lit stars follow the rounded rating; the rest in `--ink-200`, the design's review-row unlit colour | Five gold stars for a 4.2 overstates it | design confirms (request #47) |
| DS outlined button label `--blue-500` | `--blue-600` label; the hairline stays `--blue-500` | blue-500 text is 4.3–4.4:1 on the tinted cards it sits on (blue-50 featured card, green-50 first-mentees card) and on its own blue-50 pressed state; blue-600 is ≥5.0:1 everywhere (WCAG 1.4.3, axe) | design adopts (request #48) |
| Mentor Profile header "No sessions yet · Joined Sep 2026" | "No sessions yet" alone | The API has no join date | backend adds `joined_at` (backend request #14) |
| First-mentees card "Got funded. {award}, fully funded." / Explore "New mentor · {award}" | The card says "Got funded. {award}." without ", fully funded"; Explore falls back to "· N sessions" | No funding field on awards, and no awards on the list API | backend adds them (backend request #17) |
| First-mentees card (owner) on a pending, declined or unlisted profile | Not shown; the OwnerBar explains | "Share your profile" would push a link that 404s for everyone else (review of #25) | design confirms (request #51) |
| BookingModal opened from "Book {time}" when no offering still has that time | Opens on the first offering with "That time was just taken. Here's what's open." (provisional) | The card's time is the mentor's earliest across offerings and can be minutes stale (review of #25) | design supplies copy (request #50) |
| Mentor Profile Background note "Has made the move from Nigeria to United States" | "…to the United States" (the card's `countryInSentence` rule) | Copy fix, made in frontend (product 2026-09-27: small copy/typography fixes are ours) | design file catches up |
| Similar mentors row: "5.0" on a new mentor (Ademola D., 1 session) | No rating without reviews | Product rule: a mentor with no reviews never shows a star rating | never |
| Reviews guest gate: "Continue with email" + "Continue with Google" | "Continue with email" (to `/signup?next=…`) and "Log in" only | Google sign-in isn't built | Google auth ships |
| Review note `due`: "Your review on Sep 19 (SOP review) helps…" + "Write a review" | "Your review helps other mentees choose, and takes about a minute." with no button | The relationship API has no session date or type, and writing a review isn't built | review writing ships (and the API names the session) |
| Review note `again` ("You've had 3 more sessions since your last review") | Not shown | The API gives no count of sessions since the last review | backend adds it |
| Reviews "Show fewer reviews" after expanding | Not offered | Reviews page from the server (cursor); collapsing would drop fetched pages | never |
| Review filter chips from the design's topic list | The mentor's own session types ("All" + one per type, only with 2+) | The API filters by `session_type` id | never |
| BookingModal empty week: "Try later dates." / "Check back soon." | Also "Try earlier dates." when only earlier weeks have times | "Check back soon" was wrong there (review of #26). Copy fix, ours (product rule) | design file catches up |
| Mentor photo placeholder: design tone per sample (Explore cards) | Tone from a hash of the mentor id over 6 tokens | Real data has no tone field. The profile follows the design's cover rule instead: the photo circle is the cover's paired dark colour | design supplies a rule for cards |
| BookingModal first-mentees box "Got funded. {award}" (Explore) | Only "Made the move…" on Explore bookings; no box when the move isn't known | The list API has no awards (backend request #17) | backend ships #17 |
| Profile "Change cover" panel (colour picker, cover art, topic icons) | Automatic cover colour only | Storing a chosen colour/art needs backend #19; owner editing comes in later PRs | owner-edit PRs |
| AppShell role switch ("Switch to mentee" / "Mentor · also a mentee") | Any mentor profile (any state) gets the mentor nav — no Explore, no switch; Admin never shown | Product (2026-09-28): mentors don't see Explore; role switching isn't built | product revisits dual roles |
| Text inputs and bordered segment groups render 39px in the prototype (`height: var(--control-h-sm)` is content-box there; selects and buttons render 37px) | Every control is `--control-h-sm` = 37px, border-box (app-wide `box-sizing: border-box`) | Product (2026-09-28): a prototype artifact — rows mixing inputs, selects and segmented groups line up only at one height. Session Types design request #1 | design sets `box-sizing` or a 39px token |
| Wizard step number 11px (literal) | `--step-dot-text` (ours) | No DS token for 11px | DS adds a step size |
| Session Types phone rules in AppShell's global `<style>` (radiogroups/selects full width, steps scroll sideways) | The same rules, per component at 768px (SegmentedControl, Select, WizardSteps) | Handoff §7.3 | never |

## Rules

- **`Revisit when` is not optional.** "never" is a valid answer; blank is not.
- A divergence in a **value** is a row here. A divergence in **behaviour** is an ADR as well.
- A gap in the design is provisional work, listed for design in `docs/handoff/*-design-request.md`.
- When the design updates, read this file before assuming a difference is a bug.

## Tokens that are ours, not the design's

Defined in `src/styles/tokens/ours.css`. A redesign must not silently drop them:

| Token | Why it is ours |
|---|---|
| `--focus-ring-*` | the design has no focus state |
| `--text-placeholder` override | contrast fix |
| `--skeleton-fill`, `--skeleton-pulse-duration` | not tokenised in the design |
| `--overlay-scrim`, `--overlay-scrim-sheet`, `--shadow-modal`, `--shadow-popover` | design literals in Modal / sheet |
| `--photo-tag-tint`, `--photo-scrim`, `--photo-tag-border` | text over photos (Design decisions §8) |
| `--plus-fill`, `--plus-text`, `--warning-subtle`, `--warning-text` | design literals; warning ramp incomplete in DS |
| `--rating-star` | design literal `#f3a218` |
| `--gold-subtle` | design literal `#fffbef` (award and mentoring-time icon tiles, Mentor Profile) |
| `--avatar-tone-1…6` | initials grounds, read off design samples |
| `--button-h-large`, `--button-h-medium`, `--button-h-small`, `--button-compact-h`, `--touch-target-min` | CTA hierarchy heights (the DS button sizes differ), chip height, 44px targets |
| `--modal-icon-*` (bg/ring/ink × default, danger, success) | Modal.dc.html `tone` literals (`#f5f9ff`, `#fff6f5`, `#f3fbf6` rings) |
| `--step-dot-text` | Session Types wizard step number, literal 11px |
| reduced-motion durations | not drawn |
