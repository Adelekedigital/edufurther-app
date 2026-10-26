# 0010. Join always opens the session page

- Status: Accepted
- Date: 2026-10-26
- Deciders: product (owner, PRD "Frontend fixes (26 Oct)", fix 6)
- Supersedes: the time-aware Join rows in `design-divergence.md` (Bookings locked Join, Dashboard "View session details")

## Context and problem statement

Four places show a confirmed session's next step: the Bookings hero, the Bookings details
panel, Mentee Home and Mentor Home. Each decided on its own, from the device clock, whether
Join was ready. Bookings drew a disabled Join with "Join opens in …" beside it; the two Home
cards swapped Join for "View details" or "View session details" until the window opened. The
rule was written four times, and a greyed-out button reads as broken.

The Join on these cards never enters the call. It is a link to `/sessions/{id}`, and that page
already shows every phase itself: the countdown and its own disabled Join before the window
(ADR 0009's entry route), the lobby during it, the outcome after.

## Decision drivers

- One rule for every place that shows an upcoming session.
- No disabled control outside Session Join.
- The session page, not each card, decides what happens at a given moment.

## Decision

Every confirmed upcoming session shows an enabled primary "Join session" link to
`/sessions/{id}`, with no join-window check. "Upcoming" is one shared rule,
`isUpcoming(b, now)` in `src/lib/utils/bookings.ts`: confirmed and before `ends_at`, or
settled with the viewer's door still open. `useUpcomingBookings` filters with the same
rule, so a card and its list can't disagree. The card leaves when the session leaves
upcoming. "Join opens in …", "View details" and "View session details" are removed, with
`joinOpensInMinutes`.

## Consequences

- Join shows days ahead; pressing it lands on the countdown. That is the intended reading.
- A running session past its arrival window shows Join to someone who never joined; the session
  page explains that joining has closed (ADR 0009, `?enter=closed`).
- The design still draws "View details" before the window on the dashboard. That is
  recorded as an owner decision in `design-divergence.md` and the design sync log.
