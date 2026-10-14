# Ported screens: what each PR built

Moved from `SKILL.md` (Design source table) on 2026-10-12, unchanged. History of
which parts of the design are built, screen by screen. Check the live design with
`DesignSync` before treating any of it as current.

## Which parts are ported?

Explore (`/explore`): tokens, atoms, AppShell, ModalShell (incl. the phone sheet), MentorCard, MentorResults, BookingFlow (real slots, 7-day week view).

Mentor Profile (`/mentors/[handle]`, slug or id) PR 1: read-only header, Overview, Sessions, booking card, track record, owner view; Reviews, Similar mentors and editing follow.

Session Types (`/session-types`, mentor nav "Sessions", 4 PRs): PR 1 building blocks (Switch, Radio, Select, SegmentedControl, RadioCards, WizardSteps, FormField, ModalShell `icon`/`tone`, mentor nav); PR 2 the list (`/session-types`: Live switch, delete, or schedule the deletion while sessions are booked (#80), templates, four states); PR 3 create (`/session-types/new[?template=]`: 4-step wizard — up to 3 topics, icon, stage, text / file / single / multiple-choice questions, length + notice, window + break inherit or own, dedicated hours, approval; one POST with questions + Idempotency-Key, then windows).

Calendar (`/calendar`, mentor nav "Calendar", 3 PRs): PR 1 weekly hours as a draft with a save bar (a zone change re-saves the same clock times in the new zone), month at a glance (blocked and booked days read-only), scheduling window (the mentor defaults); PR 2 blocked dates (one whole-day `block` per run of days, split by delete + recreate; part-day blocks untouched; chip × unblocks without a confirm) and the design's drawn states; PR 3 busy (pause with an optional `return_on`; the backend emails reminders 7 and 3 days before and on the day, never switches back) and video (`/me/conferencing`: EduFurther video by default, Google Meet; no Zoom, #143); PR 4 moved pause to the generated client (backend #324 shipped) and the month's booked days to `GET /users/{id}/sessions?from&to&status` (backend #326; dates in the account zone `/me` timezone, as are return dates).

Bookings (`/bookings`, both roles, 3 PRs, `layout=agendaV2`): PR 1 the three tabs (Upcoming with the next session as a hero, Pending, History with filter chips), `?tab=`, counts from `/me booking_counts` summed across sides, lists revealing 5 at a time (design `pageSize`), Join through `POST /sessions/{id}/join`; PR 2 the details aside and phone sheet; PR 3 accept / decline / cancel / withdraw, their modals, and the review entry.

Integrations (`/integrations`, mentor nav "Integration", 3 PRs, design defaults `zoomCard=none` `calendarScope=googleOnly` `summary=hide` — so no Zoom card, no Outlook row, no sync toggles, no summary pill): PR 1 the page frame, the mentor gate and "Video for sessions" (two provider cards, autosave with a loud rollback, the personal `https` link); PR 2 "Calendars" — `GET/DELETE /me/calendar`, consent in a popup we poll and close (ADR 0001), five states incl. **not available on this deployment** when `/me/calendar/connect` 500s, "Connected as …" from `account_email`, switch account, disconnect confirm; PR 3 "Payments" — the coming-soon row and **Notify me** on `POST/GET /me/interest`, a feature-agnostic slug Explore's cut button reuses (divergence row 19).

**The design has since moved** (`videoLayout=rows`, `mobileCollapse=on`, a new `CollapsibleSection`); that update is not built.

## Session Join (`/sessions/[id]`)

4 PRs, `layout=lobby`. PR 1: the focused page (`FocusPage`, no rail) and the lobby before and during the call — clock, both people with presence from each party's `joined_at` (polled 15 s while someone may arrive, 60 s while far off or settling, never once final), Join through `POST /sessions/{id}/join`, Cancel, the answers and quick-guide disclosures — plus two states of ours: past `join_closes_at` (#379, #188) and over-but-unsettled (never infer "missed" from the clock). Bookings' Join opens this page. Statuses it doesn't draw redirect to `/bookings?booking=`. PR 2: Rejoin through `POST /door` until `door_closes_at` for anyone who joined (no late first-timers), no clock once started, the page follows the clock while a settled session still runs, and Add to calendar (Google, Outlook.com, .ics; never the call link). PR 3: completed and missed drawn here: who missed it from each party's recorded attendance (never the clock), credit copy only within the backend's rule (refund only when the mentor alone was absent), and the review written on this page in the shared `ReviewDialog` (`app/_reviews`, also the profile's). Screen complete; follow-ups are issues. PR 4a/4b: the server's late-joiner 409 says the page's own sentence; presence reads "Joined" from Daily's `in_room_at` (has been in the room) or, on Meet, the Join press, with "Joining…" between on Daily, and never a live "Here now" until backend #394; Rejoin stays gated on `joined_at`

## Mentor Dashboard (`/dashboard`, mentor home)

PR A (`Mentor Dashboard v2.dc.html`): the route + AppShell frame (active Home; non-mentors bounce to `/`); the header (greeting + subline + a labelled Share-profile menu) with a new `ProgressBar` atom and a `triggerLabel` variant on `ShareMenu`; the **SetupBanner** (setup progress from owner `completeness` / `setup_needed` + `/me/calendar`; the "shared" step is a local flag); and **NextSessionCard** (soonest hosted session, four states, Join only in the join window) as the interim for active mentors and set-up-new mentors. "Choose how to start" (needs the waitlist) and the activation hero (funnel / journey / "do this week") follow in PR B; metrics (KPIs, PerformanceChart, Session quality) in Phase 2. Divergences in design-divergence.md; deferred next-session cues in #241.
