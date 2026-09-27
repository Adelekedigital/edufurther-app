# Handoff request: Explore (`/explore`) → backend

From: frontend session, Explore screen · 2026-09-26
To: backend session (`c:/pythonwork/edufurtherBE`)
Reply by: writing answers inline under each item (or a matching
`docs/handoff/explore-backend-reply.md`) and messaging the FE session back.

Explore builds against `GET /api/v1/mentors` → `Page[MentorSummaryRead]`. What
exists already covers name, avatar, headline, degree / course / institution,
`completed_sessions`, `review_count`, `session_value`, `offerings[]`, and `q`
search. The design card needs the items below. Each is marked **blocking**
(the card can't render it honestly without it) or **can mock** (the FE builds
it behind a typed mock in `lib/api/data/` until it lands).

## 1. Topic filter — blocking
The page has multi-select chips for the six offerings.
- Proposed: `GET /api/v1/mentors?offering=<slug>&offering=<slug>`.
- **Semantics:** the empty state reads "No mentors match *all* of that", which
  implies **AND**. Confirm AND, or tell us it's OR and we'll change the copy.
- Combined with `q`: AND with the text search?

## 2. The six offerings as a list — blocking
Chips need `{slug, display_name}` in display order. Is there a lookup endpoint,
or should the FE hard-code the closed taxonomy (settled decision #53)?

## 3. Price summary per mentor — can mock
The card says "Free mentorship available" or "Paid sessions from $X".
- Proposed on `MentorSummaryRead`: `has_free_session_type: bool`,
  `min_price: {amount_minor: int, currency: "USD"} | null`.

## 4. Next available slot — can mock
The card says "Next available: Today, 12:00 pm".
- Proposed: `next_available_at: datetime (UTC) | null`, earliest bookable slot
  across active session types. The FE formats it in the viewer's zone.
- If this is too expensive for a list, say so — we'll drop the line and record
  the divergence rather than call `/slots` per card.

## 5. Mentor label + Plus — can mock
Photo tag: **Top-rated / Rising mentor / Experienced mentor**, plus a **Plus**
tag.
- Proposed: `label: "top_rated" | "rising" | "experienced" | null`,
  `is_plus: bool`.
- Rising = 0–2 sessions and no reviews (from design). **Top-rated and
  Experienced have no product definition yet** — whoever owns that, please
  flag it; we'll hide the tag until it exists.

## 6. Rating on the card — confirm
The design shows "★ 4.9 (11 reviews)". Is `session_value` (mean
`valuable_rating`, 1..5) the number to show there? Null when `review_count = 0`
— we show "New to EduFurther" in that case, never a zero rating.

## 7. Result count — confirm
The page shows "{N} mentors for {k} topics". Cursor pages have no total. Either
add `total` (or `total_estimate`) to this endpoint, or we change the copy to not
state a number. Your call; tell us which.

## 8. Order — confirm
Currently newest first. Is that the intended Explore order for launch?
(Match-based ranking is not built; the design's default hides the match score.)

## 9. Page size / paging — confirm
Default and max `limit`? We plan "Show more mentors" (button, not infinite
scroll) using `next_cursor`.

## 10. Dev wiring — needed to start
- Local base URL and CORS origin for `http://localhost:3000`.
- A current `openapi.json` snapshot (or the command to export one) — we
  generate the TS client from it.

## Not asked for yet (later screens)
BookingModal (slots, intake questions, create booking + idempotency key,
guest hold for 10 minutes) — a separate request once Explore's list is live.
