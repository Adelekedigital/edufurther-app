# Ported screens: what each PR built

Moved from `SKILL.md` (Design source table) on 2026-10-12, unchanged. History of
which parts of the design are built, screen by screen. Check the live design with
`DesignSync` before treating any of it as current.

## Which parts are ported?

Explore (`/explore`): tokens, atoms, AppShell, ModalShell (incl. the phone sheet), MentorCard, MentorResults, BookingFlow (real slots, 7-day week view).

Mentor Profile (`/mentors/[handle]`, slug or id) PR 1: read-only header, Overview, Sessions, booking card, track record, owner view; Reviews, Similar mentors and editing follow.

Session Types (`/session-types`, mentor nav "Sessions", 4 PRs): PR 1 building blocks (Switch, Radio, Select, SegmentedControl, RadioCards, WizardSteps, FormField, ModalShell `icon`/`tone`, mentor nav); PR 2 the list (`/session-types`: Live switch, delete, or schedule the deletion while sessions are booked (#80), templates, four states); PR 3 create (`/session-types/new[?template=]`: 4-step wizard — up to 3 topics, icon, stage, text / file / single / multiple-choice questions, length + notice, window + break inherit or own, dedicated hours, approval; one POST with questions + Idempotency-Key, then windows).

Calendar (`/calendar`, mentor nav "Calendar", 3 PRs): PR 1 weekly hours as a draft with a save bar (a zone change re-saves the same clock times in the new zone), month at a glance (blocked and booked days read-only), scheduling window (the mentor defaults); PR 2 blocked dates (one whole-day `block` per run of days, split by delete + recreate; part-day blocks untouched; chip × unblocks without a confirm) and the design's drawn states; PR 3 busy (pause with an optional `return_on`; the backend emails reminders 7 and 3 days before and on the day, never switches back) and video (`/me/conferencing`: EduFurther video by default, Google Meet; no Zoom, #143); PR 4 moved pause to the generated client (backend #324 shipped) and the month's booked days to `GET /users/{id}/sessions?from&to&status` (backend #326; dates in the account zone `/me` timezone, as are return dates). Calendar v2 update (PRD Calendar, 21 Oct): PR 1 "Scheduling window" became Booking rules (`BookingRulesForm`, `bookingRulesSummary`): Approve bookings first (the Settings switch and line, shared through `BookingRulesRows` `approval`), Settings' rule labels and hints, the new-tab line to `/settings/booking`; Save sends approval with the rules. PR 4 an admin-unlisted mentor (not listed, not paused by themselves) gets the "Unlisted by EduFurther" Notice with Contact support (prefilled `supportMailto`); going busy or back offline names which (`statusOffline`); every Contact support now mails one `SUPPORT_EMAIL` (`lib/config/support`), so the declined owner bar always links.

Bookings (`/bookings`, both roles, 3 PRs, `layout=agendaV2`): PR 1 the three tabs (Upcoming with the next session as a hero, Pending, History with filter chips), `?tab=`, counts from `/me booking_counts` summed across sides, lists revealing 5 at a time (design `pageSize`), Join through `POST /sessions/{id}/join`; PR 2 the details aside and phone sheet; PR 3 accept / decline / cancel / withdraw, their modals, and the review entry.

Integrations (`/integrations`, mentor nav "Integration", 3 PRs, design defaults `zoomCard=none` `calendarScope=googleOnly` `summary=hide` — so no Zoom card, no Outlook row, no sync toggles, no summary pill): PR 1 the page frame, the mentor gate and "Video for sessions" (two provider cards, autosave with a loud rollback, the personal `https` link); PR 2 "Calendars" — `GET/DELETE /me/calendar`, consent in a popup we poll and close (ADR 0001), five states incl. **not available on this deployment** when `/me/calendar/connect` 500s, "Connected as …" from `account_email`, switch account, disconnect confirm; PR 3 "Payments" — the coming-soon row and **Notify me** on `POST/GET /me/interest`, a feature-agnostic slug Explore's cut button reuses (divergence row 19).

**The design has since moved** (`videoLayout=rows`, `mobileCollapse=on`, a new `CollapsibleSection`); that update is not built.

## Session Join (`/sessions/[id]`)

4 PRs, `layout=lobby`. PR 1: the focused page (`FocusPage`, no rail) and the lobby before and during the call — clock, both people with presence from each party's `joined_at` (polled 15 s while someone may arrive, 60 s while far off or settling, never once final), Join through `POST /sessions/{id}/join`, Cancel, the answers and quick-guide disclosures — plus two states of ours: past `join_closes_at` (#379, #188) and over-but-unsettled (never infer "missed" from the clock). Bookings' Join opens this page. Statuses it doesn't draw redirect to `/bookings?booking=`. PR 2: Rejoin through `POST /door` until `door_closes_at` for anyone who joined (no late first-timers), no clock once started, the page follows the clock while a settled session still runs, and Add to calendar (Google, Outlook.com, .ics; never the call link). PR 3: completed and missed drawn here: who missed it from each party's recorded attendance (never the clock), credit copy only within the backend's rule (refund only when the mentor alone was absent), and the review written on this page in the shared `ReviewDialog` (`app/_reviews`, also the profile's). Screen complete; follow-ups are issues. PR 4a/4b: the server's late-joiner 409 says the page's own sentence; presence reads "Joined" from Daily's `in_room_at` (has been in the room) or, on Meet, the Join press, with "Joining…" between on Daily, and never a live "Here now" until backend #394; Rejoin stays gated on `joined_at`

## Mentor Dashboard (`/dashboard`, mentor home)

PR A (`Mentor Dashboard v2.dc.html`): the route + AppShell frame (active Home; non-mentors bounce to `/`); the header (greeting + subline + a labelled Share-profile menu) with a new `ProgressBar` atom and a `triggerLabel` variant on `ShareMenu`; the **SetupBanner** (setup progress from owner `completeness` / `setup_needed` + `/me/calendar`; the "shared" step is a local flag); and **NextSessionCard** (soonest hosted session, four states, Join only in the join window) as the interim for active mentors and set-up-new mentors. "Choose how to start" (needs the waitlist) and the activation hero (funnel / journey / "do this week") follow in PR B; metrics (KPIs, PerformanceChart, Session quality) in Phase 2. Divergences in design-divergence.md; deferred next-session cues in #241.

PR 4 (`active-mentor KPI grid`): the 4 active-mentor KPIs (sessions completed, mentoring hours, mentees mentored, average rating — real, all-time) via a shared **KpiCard** adopted from the mentee dashboard (#239) and extended with the mentor’s info tooltip. No trend line and no period data (#245). PerformanceChart and the Session-quality panel follow.

Fix (`fix/mentor-dashboard-kpi-polish`): Mentoring time now reads in **minutes** — exact, so a single 90-minute session no longer rounds up to "2 hrs" (user direction, 2026-10-14). The metric-hint ⓘ became an accessible **InfoTip** atom — opens on hover, keyboard focus and tap, closes on Escape, flips to stay on-screen — replacing the hover-only native `title` that was dead to keyboard and touch (BFM "Contextualising dates"). Backend #446/#449 (mentor-stats) later unblock the trend line + the chart's real time-series.

PR 5 (`session performance chart`): **PerformanceChart** (organisms) — stacked bars (completed / canceled-all / missed) or lines over months, a range switch (3M/6M/12M + year, a radiogroup + a year select), a filtering legend and a hover tooltip, ported to the design's fixed 600×262 geometry. Real data from `GET /me/mentor-stats/monthly` (#449) via `useMentorMonthlyStats`; a `PerformanceSection` holds loading/error, the chart owns empty/content. Adds a `dashboard` EmptyState illustration + a `--shadow-control` token. The shared `useMentorStats` (windowed, #446) lands here for the KPI-trend + session-quality panels, with mock handlers for both mentor-stats endpoints so the dev page shows real-shaped data.

## Sign up and log in (`/signup`, `/signup?role=mentor`, `/login`; Sign In.dc.html)

PR 1 (#277, building blocks): the name rule for one- and two-field inputs (`lib/utils/name.ts`), email typo fixes, the on-screen code lock, Last used, `lib/config/auth.ts`, and the `LegalLine`, `Toast` and restyled `GoogleButton` molecules.

PR 2 (#278, the form): `organisms/SignInForm` — every step (start, code, finish, suspended) and state of the design, props only, 30 stories.

PR 3 (the screen): `AuthScreen` + `useSignInFlow` run the flow — code or Google, then `GET /me`: a never-named account (`first_name === null`) is named from the sign-up field, Google's names, or the finish step (`PATCH …/profile {full_name}`), then a toast (1.4 s) and the redirect from `signInOutcome` (`app/_auth/outcome.ts`). Google comes back through `/auth/callback` to the screen (`auth=google`, with `mode`, `role`, `next`). `EmailCodeForm` removed. PR 4 adds the booking / invite context line and the invite claim.

## Mentee onboarding (`/onboarding`, `/onboarding/mentee`)

Mentee Onboarding v5.dc.html saved defaults, PRD "Mentee Onboarding v5" (rev 95). Behind `NEXT_PUBLIC_ONBOARDING_ENABLED` (`ONBOARDING_LIVE`): a 404 where it is off.

- **PR A (#279):** HelpAreaPicker, StudyPlansForm, MatchResults, MatchReason, TopicGroups; MentorCard `highlight` and "+N"; 48px `xl` fields.
- **PR B:** `/onboarding` reads `/me` and redirects by role, keeping the query (mentors home until mentor onboarding ships); `/onboarding/mentee` runs help areas → study plans → matches. Answers resume from the server (`GET /me`), each Continue saves, step 2 completes (PRD B3). Book opens BookingLauncher in place; a sent request goes Home. Endpoints the backend hasn't shipped are typed mocks marked PENDING BACKEND (docs/handoff/onboarding-backend-request.md #1–6).
- **Next:** the guest path (`for/sid/time`, "Your pick is saved"), migrated-mentee routing (H5); the onboarding nudge was retired 2026-10-18 for the setup lock (round 4), AiField.

PR 4 (booking guest step): the booking modal's guest step signs people in for real (BookingModal.dc.html, `signupAt=afterTime`) — email → code → name, Google with a return to the reopened modal, PRD F3 copy (no hold claimed). The code logic is shared with the sign-in page (`useEmailCodeAuth`). PR 5: the sign-in page's booking context line and mentor-named toasts. Invites: #281; waitlist line: #282.

PR 5 (booking context): the sign-in page shows "Log in or sign up to finish booking {First L.}" with the mentor's avatar when `next` is a booking, on the mentee pages; booking toasts name the mentor ("…your booking with {First}…"). This closes the Sign up and log in build; open follow-ups: #281 (invites, after onboarding), #282 (waitlist line, no waitlist screen yet).
