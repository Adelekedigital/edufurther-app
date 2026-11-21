# 0014. What's new tours: release-keyed content + backend seen list

- Status: Accepted
- Date: 2026-11-20
- Deciders: product (owner approved the design, 2026-11-20); backend session (the contract)

## Context and problem statement

On 23 Nov 2026 every account from the old app moves to this one. Those people know where
things used to be, and several things now live somewhere else (weekly hours in Calendar,
session types, video links made for them, monthly credits). They need a short, skippable
look at what changed, once, on the device they happen to use, and a way to see it again.
More of these will follow later releases, so the second one must not need new code.

## Decision drivers

- Shown once per account, not per device: a person on a phone and a laptop sees it once.
- Never in the way: not over onboarding, the setup lock, the consent banner or another ask
  (the install nudge, the push ask), never in Preview as user.
- A real dialog for everyone: focus held, Escape works, screen readers hear what is lit.
- The next release is content, not a build.

## Considered options

1. Device storage (localStorage) for "seen".
2. A dedicated flag on `/me` per release (`seen_whats_new_2026_11`).
3. A generic seen list on `/me` (`seen_items: string[]`) written by key.
4. A third-party product-tour SDK.

## Decision

Option 3, with the content in one typed file.

- **Backend**: `GET /api/v1/me` carries `seen_items` (required, oldest first);
  `PUT /api/v1/me/seen-items/{key}` stores one (204, idempotent, key
  `^[a-z0-9][a-z0-9:._-]{0,79}$` else 422, refused in Preview as user). Until the spec
  publishes them they are PENDING BACKEND (`lib/api/data/pending.ts` `PendingMeRead`,
  `seenItems.ts`); a `/me` without the list shows no tour, since the answer couldn't be kept.
- **Content**: `lib/copy/whatsNew.ts`, `TOUR_RELEASES`: each release has an id (its seen
  key), an audience (`migrated` today), its flag, and per role a welcome, steps (target id,
  badge, title, body, optional phone body, optional `required`) and a done card.
- **Selection** (pure, `lib/utils/whatsNew.ts`): `releaseFor` (live, audience, role, not
  seen), `tourMayStart` (the role's Home, not previewing, not in setup, no consent banner),
  `tourSteps` (drop a step whose target is missing; a missing `required` one holds the tour).
- **Targets by id**: AppShell nav items and CreditsPill carry `data-tour`; the More button
  lists the ids its sheet holds (`data-tour-holds`), and AppShell's `tourMore` holds the sheet
  open for such a step on phones.
- **UI**: `templates/WhatsNewTour` (welcome on ModalShell, step card on useFocusTrap with a
  cut-out scrim, done card as `role="status"`), loaded only when it opens; the host is
  `app/_shell/useWhatsNew` in the (app) layout.
- **Replay**: "What's new" in the account menu (desktop) and More sheet (phones), and
  Settings' "Replay tour", link to the role's Home with `?tour=replay`, which opens the
  welcome whether seen or not (replay never un-sees). Offered per release from `liveFrom` for
  `replayDays` (default 30), same audience rules. Per-user windows (30 days from when each
  person saw it) would need `seen_at` from the backend; deliberately not done.
- **Done card**: an optional `doneAction` (label, href) per role leads on (mentors: "Check my
  hours" to Calendar) beside "Got it"; `tour_completed` says which (`cta` or `dismiss`).
- **Seen**: on Not now, Skip, Escape and Finish. Optimistic: this visit's list and the cached
  `/me` take it at once, the PUT retries quietly.
- **Other asks**: the tour claims the visit from the install nudge (`claimVisitForTour`) and
  holds the mentor push ask while it is due; an ask that already had the visit makes the tour
  wait for the next one.

## Consequences

- Good: one place to add a release; seen follows the account across devices; nothing loads
  on pages where no tour is due.
- Good: the same list can carry other one-time things later (quiet "New" badges on a nav item).
- Bad: until the backend releases `seen_items`, no tour shows outside the mock (by design).
- Neutral: a key is forever. Renaming a live release id shows it again to everyone.

## Future options (not built)

- Audiences `admin` and `new_signup` (an `audience` value and its rule in `releaseFor`).
- Quiet "New" badges on a nav item, keyed the same way, instead of a full tour.
