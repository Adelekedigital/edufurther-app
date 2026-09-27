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
| Account menu item "Find my mentor matches" | Not rendered (account menu held) | No auth | auth (phase B) |
| Featured card button "Book session with Oluchi" (surname) | "Book session with {first name}" | Matches every other Book label; design sample used split[1] | never |
| Featured card secondary text `--ink-500` on `--blue-50` | `--ink-600` inside the card | ~4.2:1 fails AA on the blue ground (axe, page review) | design picks a token for text on blue-50 |
| Page size 24 (Design decisions §3) | 10 per page | Product (2026-09-27): quick to scan, "Show more mentors" for the rest | product revisits |
| Explore page `max-width:1120px` | `calc(2 * 493px + 16px)` = 1002px | Product (2026-09-27): Figma card max width is 493px; at 1120 two cards grew to ~552px and photos dominated. Hero, featured and filters share the width so edges align | design adopts (request #23) |
| Explore section `gap:var(--space-6)` (24px), phones 16px | `--space-8` (32px), phones `--space-6` (24px) | Product (2026-09-27): hero → featured → "What do you need help with?" read cramped | design adopts (request #23) |
| MentorCard `padding:var(--space-4)` (16px) | `--space-6` (24px), skeleton too | Figma has 24px; the .dc.html lags it (product 2026-09-27) | design adopts (request #23) |
| MentorCard / featured photo `object-fit:cover; object-position:50% 25%` | Whole photo, `object-fit:contain`, over a blurred copy of itself (`cover`, `blur(24px)`, `scale(1.15)`) | Product (2026-09-27): real photos are portrait; cropping to 3:2 cut heads and shoulders | design adopts (request #23) |
| Mentor photo placeholder: design tone per sample | Tone from a hash of the mentor id over 6 tokens | Real data has no tone field | design supplies a rule |

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
| `--avatar-tone-1…6` | initials grounds, read off design samples |
| `--button-compact-h`, `--button-compact-h-touch`, `--touch-target-min` | compact CTA (handoff §7.1), 44px targets |
| reduced-motion durations | not drawn |
