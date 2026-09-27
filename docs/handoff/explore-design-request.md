# Handoff request: Explore (`/explore`) → design

From: frontend session, Explore screen · 2026-09-26
Design source: https://claude.ai/design/p/fb0b8ef2-d0b9-4366-b6ab-33f22c441cd8 (`Explore.dc.html`, `MentorCard.dc.html`)
Reply by: updating the design file (a new tweak or view state, per the project rule
"add a tweak prop instead of replacing") and adding an entry to `Design decisions.md`.

The build follows the design's defaults: `columns=two`, `cardLayout=photo`,
`matchScore=hide`, `bookingFlow=timeFirst`, `signupAt=afterTime`. The items below are
**not specified** in the design. Per product, the build **holds them until design
answers** rather than inventing them. Each item says what ships in the meantime.

Positioning to design against: **EduFurther is an experience-led mentorship
platform.** Copy should be actionable and encouraging.

---

## 0. Already decided: hero copy (please update the file)
Product replaced the hero copy for **both mentee and guest**:
- **Title:** Find a mentor for your study-abroad journey
- **Sub:** Get guidance from students and professionals who have been through the process. Explore free mentorship or book a paid 1:1 session.

Why: the old mentee sub ("Ranked by how well they match what you told us") claimed
match ranking, but matching isn't built and results are newest first. Copy can be
refined further, as long as it doesn't claim ranking.

## 1. Search field behaviour
- **Missing:** a clear (×) control in the field; whether results update as you type
  (and after how long) or on Enter; any minimum length.
- **Meanwhile:** results update 300 ms after typing stops, and there is no clear control.
  "Clear filters" above the chips also clears the query, as the prototype does.

## 2. Reloading with results already on screen
- **Missing:** what shows when a filter or query changes and the old results are still
  visible: skeletons replacing the cards, the old cards dimmed, or a thin progress bar.
- **Meanwhile:** the old results stay, with `aria-busy` set and no visual treatment.

## 3. Paging
- **Missing:** how more results load ("Show more mentors" button vs infinite scroll),
  and the error when a later page fails to load.
- **Meanwhile:** the first page only (up to 24 mentors), with no control to load more.

## 4. Nobody on the platform matches anything
- **Missing:** a state for **zero bookable mentors with no filters applied** (launch
  day, or a region with no supply). The designed empty state ("No mentors match all
  of that", with Clear search) assumes filters caused it, so Clear search would do nothing.
- **Meanwhile:** the filtered-empty state, without the Clear button when nothing is applied.

## 5. Error variants
- **Missing:** offline while on Explore (the shell banner shows, but what happens to
  the results area?), and a list that has to restart (the server rejected the page
  cursor).
- **Meanwhile:** the designed error ("We couldn't load mentors" + Try again) for both.

## 6. Destinations that aren't designed
- **"Get matched instead"** (empty state), **"Find my matches"** (guest prompt),
  **"Edit goals"** (match note). All three lead to onboarding goals or mentee settings,
  which are out of scope in the handoff.
- **Meanwhile:** these controls are **not rendered**. The guest prompt section is held.

## 7. Card → profile
- **Missing:** the card's only action is Book. Should the name or photo open
  `/mentors/[handle]`? If so, what's the affordance (whole card or name link)?
- **Meanwhile:** no profile link on the card.

## 8. Real photos
- **Missing:** the design uses coloured blocks with initials. With real `avatar_url`:
  - the fallback when there's no photo;
  - crop and focal point;
  - legibility of the white-outlined label tag on bright photos (a dark overlay?).
- **Meanwhile:** photo when present, the initials block when not. The label tag keeps
  its designed 35% ink tint.

## 9. Card fields that can be missing
- **No next slot** (a mentor is bookable but has nothing open soon): what does the
  "Next available" line say, and is Book still enabled?
- **No price data yet:** what does the price line say?
- **Label definitions:** "Top-rated" and "Experienced mentor" have no product rule.
  Only "Rising mentor" is defined (0–2 sessions, no reviews).
- **Meanwhile:** lines with no data are hidden. The label tag shows only for Rising.

## 10. Result count
- **Missing:** "{N} mentors for {k} topics" needs a total, which the API may not give.
  Wording if it's unknown: e.g. "Mentors for 2 topics"?
- **Meanwhile:** depends on the backend reply. If there's no total, the count line is held.

## 11. Long content
- **Missing:** truncation rules for long names (e.g. "Chukwueze Morgan-Stanley" at
  390px), long degree/school lines, and 4+ matched topics.
- **Meanwhile:** wrap names; degree/school clamps to 2 lines.

## 12. Interaction states (build adds these as *ours* unless design objects)
Hover, pressed and focus for the topic chips and card; disabled/busy for Book;
reduced-motion for the skeleton pulse. The build uses the DS focus ring (2px
`--blue-500`, 2px offset) and the DS hover/pressed steps. **No reply needed unless
design wants something different.**

---

## Round 2 — after design's answers and the backend's revised reply (2026-09-26)

Design answered items 1–12 in `Design decisions.md` ("Explore: answers to the frontend
handoff request"). The build follows them, except where the backend contract differs
(recorded in `.claude/skills/project-conventions/references/design-divergence.md`).
New open items:

### 13. Empty-state copy under ANY-of topics — needs copy
The backend now matches **any** selected topic (revised reply #1), so selecting more chips
**widens** the list. "No mentors match all of that" / "Try removing a topic or two" no
longer describe what happened.
- **Shipping provisionally:** title "No mentors match that"; body with a query:
  "No one matches “{q}” for these topics. Try a different name, school or program, or other
  topics."; topics only: "No mentors help with these topics yet. Try other topics to see more
  mentors."
- Please confirm or replace.

### 14. Two controls named "Clear search"
The × in the field (clears the query) and the empty-state button (clears topics **and**
query) share one name but do different things. Suggest the empty-state button becomes
"Clear filters", matching the link above the chips. Shipping as designed until you decide.

### 15. Mentor with sessions but no reviews
The backend notes that no reviews ≠ new (a mentor can have 12 sessions and 0 reviews). The
card shows "New to EduFurther" only for 0–2 sessions; otherwise **"No reviews yet · 12
sessions"** (no icon). Provisional — please confirm the copy and whether it wants an icon.

### 16. "Notify me" on "Mentors are on their way"
Product decided: signed-in users only, one automatic email. Guests need a different
action (e.g. "Create an account to be notified"?) — not designed. Meanwhile the button is
hidden for everyone and the body's second sentence ("…or we can tell you when…") is
dropped so the copy doesn't promise it.

### 17. Offline with nothing loaded yet
Design covered offline **with** cached results. With nothing cached, the build shows the
error state with provisional body: "You're offline. Your filters are saved, so try again
when you reconnect." Please confirm.

### 18. Hero sub copy — product and design differ
Product (in chat): "Get guidance from students and professionals who have been through the
process. Explore free mentorship or book a paid 1:1 session." Design's latest: "Get guidance
from mentors who have been through the process. Explore free 1:1 mentorship sessions."
Backend: no prices; sessions use **credits**. The build ships design's latest. Is "free"
accurate under credits?
