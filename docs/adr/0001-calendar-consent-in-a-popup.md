# 0001. Google Calendar consent runs in a popup we poll, not a redirect

- Status: proposed
- Date: 2026-10-05
- Deciders: product (to agree); frontend session edufurtherfe-e6, backend session edufurtherbe-37
- Supersedes: —

## Context and problem statement

Connecting a mentor's Google Calendar is an OAuth round trip that leaves our origin. The
backend's callback, `GET /api/v1/callbacks/google/calendar`, answers `200` with
`{"connected": "<user_id>"}` **and does not redirect** — deliberately: `PUBLIC_BASE_URL` is
the API's own origin, and a service guessing an application route is how a deployment
redirects somewhere that does not exist.

So the browser ends on a page of JSON on another origin, which we cannot read. Nothing tells
the app the grant now exists, and there is **no `pending` record** — a mentor who denies
consent leaves the server in exactly the state it was in before. Whatever we build has to
work out the answer by asking our own API, and has to end somewhere for a mentor who never
finishes.

## Decision drivers

- The callback cannot be changed to redirect without a `return_to` that round-trips inside
  the sealed `state` and is checked against an origin allow-list — an unchecked one is an
  open redirect, the same class of attack the sealed state exists to prevent. That is a
  security-reviewed PR, not a flag (backend reply #4).
- Denying consent writes nothing, so "wait until something changes" never terminates.
- Popups are weakest on phones, which is where a meaningful share of mentors are.
- Nothing can exercise the real flow today: no deployment has a Google client configured
  (backend issue #366).

## Considered options

1. **Popup, then poll `GET /me/calendar` and close the popup ourselves.**
2. **Full-page redirect to Google**, returning to a JSON page on the API's origin.
3. **Wait for `return_to`** and build the full-page flow once the backend ships it.

## Decision

Option 1 — open the popup on the click, point it at `consent_url`, poll `GET /me/calendar`
while it is open and whenever our tab regains focus, and close it from our side once a *new*
grant appears. Option 2 strands the mentor on raw JSON with no way back; option 3 blocks a
screen on a security-reviewed backend PR that nobody has scheduled.

## Consequences

Good:
- Works today, on the contract as it actually is, with no backend change.
- The mentor never sees the JSON — we close the window for them.
- Every branch ends somewhere actionable: connected, nothing connected, pop-up blocked,
  timed out, or not available on this deployment.

Bad:
- **Popups are poor on phones.** Mobile browsers open a new tab rather than a window; the
  user must come back to our tab themselves. We mitigate with a focus/visibility listener,
  but we cannot make it as good as a redirect.
- **Pop-up blockers.** The window must be opened synchronously on the click, before the
  `consent_url` request — a window opened after an `await` has lost the user gesture. This
  is a non-obvious constraint that a later refactor can silently break.
- **Polling is a guess, not a signal.** We ask every 1.5s and give up after 3 minutes. A
  mentor on a slow consent screen can be told "nothing was connected" when they were simply
  slow.
- **We cannot tell "denied" from "closed the window"** — both look identical from here — so
  the copy has to cover both without claiming which happened.
- One more moving part than a redirect: a timeout, two listeners and a close call that a
  redirect would not need.

Accepted because:
- The alternative that is actually better for users (option 3) is not available, and holding
  the screen for it trades a working flow for an unscheduled one.
- **What would change this:** the backend shipping `return_to` with an origin allow-list
  (scoped, not scheduled — backend reply #4). At that point the full-page flow is strictly
  better on phones and this should be revisited rather than kept out of habit. The popup
  code is one util and one hook, so replacing it is small.
- The honest caveat on all of it: **this has never run against a real Google consent screen**,
  because no environment has a client configured (backend #366). It is proven against a mock
  that mimics the contract, and the one path proven for real is the unavailable state.
