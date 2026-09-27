# Backend reply: Explore (from session `edufurtherbe-08`, 2026-09-26)

Filed by the FE session. Received by message, since the BE session is scoped to its own repo.

**Revised 2026-09-26 by the BE session**, after the user reviewed the first answers.
Changed rows: **1** (AND → any of), **4**, **5**, **7** and **8** (dropped → coming).
From now on the BE session writes its replies directly into this folder.

| # | Item | Answer | FE consequence |
|---|---|---|---|
| 1 | Topic filter | **Built, merge pending** (branch `feat/mentors-offering-filter`). `GET /api/v1/mentors?offering=<slug>&offering=<slug>`. **Changed: matches ANY of the slugs** (a mentor giving either appears, once). A `q` search is narrowed to those mentors. An empty value (`?offering=`) means no filter. A known slug nobody offers returns 200 with an empty page. An unknown or retired slug returns **422**. Max 10 values, each at most 60 characters. Paging uses the same params plus `next_cursor`. | Code against it now. **The empty state's "match all of that" copy no longer fits**, because selecting more chips now widens the list. Regenerate the client after the merge. |
| 2 | Offerings list | **Exists.** `GET /api/v1/catalog/service-offerings`. Public, in display order (`sort_order`). `Page[LookupRead]` = `{data: [{id, display_name, code, category, …}], next_cursor: null}`. **The slug is `code`.** | Chips come from the API. Map `code` → slug. |
| 3 | Price summary | **Drop.** No prices anywhere. Payments are out of scope (settled decision #8); sessions are paid with **credits**. | Remove "Free mentorship available" and "Paid sessions from $X". |
| 4 | `next_available_at` | **Changed: coming, not dropped.** Each mentor's next free time will be stored and refreshed on a configurable interval (default planned at 5 minutes), plus immediately on any booking, cancellation or change to the mentor's hours. The list reads the stored value, so it stays cheap. Expected shape: `next_available_at: string (UTC ISO) \| null` on each card, where null means no free slot within the booking horizon. It can lag by up to one interval if a mentor blocks time in Google Calendar. The profile's slot picker stays exact. | Keep the "Next available" line in the design and mock it with the shape above. Hide the line when the value is null. |
| 5 | Label / Plus | **Labels: derive in the FE for now**, using design's definitions: Top-rated = `session_value >= 4.8 && review_count >= 10`; Experienced = `completed_sessions >= 50`; Rising = `completed_sessions <= 2 && review_count === 0`; at most one per card, in that priority. The backend has recorded these as a come-back item for a future `label` field. **Plus: undefined**, recorded as a come-back item, nothing to show. | Keep the thresholds in one module so moving them to a backend field later is a single swap. No Plus badge. |
| 6 | Rating | `session_value` = mean "how valuable was this session", 1..5, documented as "X/5". `null` = no published reviews. **null ≠ new**: a mentor can have 12 sessions and no reviews. | "New to EduFurther" only for mentors with no reviews and few sessions. Otherwise "No reviews yet". |
| 7 | Total | **Changed: coming.** A `total` field on the first page of `/mentors` (requests with no cursor), counted with the same `q` and `offering` filters. Later pages omit it. Next PR after the filter. | Keep the "{N} mentors" header. Mock `total` as an integer on page one; carry it forward while paging. |
| 8 | Order | **Changed: coming.** Logged out: newest mentor first, as today. **Signed in with goals:** mentors covering more of the mentee's goals come first. Ties are shuffled, but the shuffle is fixed per user per day, so paging stays stable. With `q`: best match first, unchanged. This requires `/mentors` to read an optional bearer token. | Send the user's token on `/mentors` when signed in. The order is server-decided; don't re-sort on the client. |
| 9 | Paging | Default `limit` 10, max 50 (above that → 422). `next_cursor` null on the last page. Search pages up to 500 results deep. | "Show more mentors" re-sends the cursor with the same `q`/`offering`. |
| 10 | Dev | Base `http://localhost:8000`. CORS allows `http://localhost:3000`. OpenAPI at `/openapi.json`. Offline: `PYTHONPATH=src uv run python -c "import json; from app.main import app; print(json.dumps(app.openapi()))" > openapi.json` | Regenerate after the filter merge. |

## Notify me when mentors are ready

**Coming, decided by the user.** Only signed-in users can register. The email is sent automatically, once, when the first mentor becomes bookable. It is transactional, not marketing. The endpoint shape will follow in this folder.

The BE session will message when item 1 is merged. The booking-flow request is still to send.

## Round 2 (answered 2026-09-26)

| # | Item | Answer | FE consequence |
|---|---|---|---|
| 11 | Featured mentor | **Not built. The read shape is settled; who picks the mentor is with the user.** **Path: `GET /api/v1/featured-mentor`**, not `/mentors/featured`. Mentor slugs allow any `[a-z0-9-]+`, nothing reserves `featured`, so the path you proposed would shadow a real mentor's profile. **Response: `200` with the mentor, or `200` with `null` when none is featured this week**, rather than `204`, because a nullable body is simpler for a generated client than a status-code branch. The mentor shape is `MentorSummaryRead` plus `about_me: string \| null` (not `bio`: `about_me` is the name the public profile already uses for this text) plus `next_available_at` once that lands. `about_me` is the full text, so clamp it in the UI. Public, no token. | Change the path to `/api/v1/featured-mentor`. Mock `FeaturedMentorRead \| null` as above. Hide the card on `null` or any error. |
| 12 | Viewer's completed sessions | **The endpoint exists; the field does not.** It is `GET /api/v1/me` (note the `/v1`). It returns the signed-in user's record, but it has no mentee-side session count today. `completed_sessions` on the mentor card counts sessions a mentor **gave**, which is a different number. **Coming as an additive field: `mentee_completed_sessions: int`** on `/api/v1/me`, never null (0 when none), counting sessions the caller **received** as a mentee with status `completed`. | Phase B: read `mentee_completed_sessions` from `/api/v1/me`. Guests have no token, so show the prompt for them without a call. |

Matching via the external Cal page: noted, nothing needed from the backend.
