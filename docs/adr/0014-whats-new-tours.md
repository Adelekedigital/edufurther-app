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
- **Two off switches**: the global `NEXT_PUBLIC_WHATS_NEW_ENABLED` (default off; read at
  build time, so on Vercel a change needs a redeploy) and each release's own `enabled`
  (turns one release off without touching the others). Every caller selects from
  `activeReleases()`, so with either off there is no tour, no "What's new" menu item and no
  Settings row. The nav's `data-tour` ids are inert markup either way.
- **Content**: `lib/copy/whatsNew.ts`, `TOUR_RELEASES`: each release has an id (its seen
  key), an audience, `enabled`, optional `labels`, and per role a welcome, steps (target id,
  optional badge, title, body, optional phone body, optional `required`) and a done card.
- **Audiences** (amended 2026-11-21): `migrated` (`/me.is_migrated` true) and `new`
  (`is_migrated` false). Unknown (`undefined`) is neither, so a person gets one tour or the
  other, never both. The Welcome tour (`welcome:2026-11`) is the `new` release: where
  everything is, for accounts made here.
- **Per-release labels** (amended 2026-11-21): a release may set its own welcome badge,
  welcome title (with and without a first name), menu item label and Settings row title and
  line (`labels`, read through `tourLabels`, TOUR_COPY's where unset). `tourReplay` returns
  the link with its release's labels, so the account menu, More sheet and Settings name the
  right tour ("What's new" or "Welcome tour"). Settings' row is an organism and takes them as
  props. A step's badge is optional; the Welcome tour's steps have none.
- **Only once set up** (amended 2026-11-21): `tourViewerOf` gives no role (no tour, no
  replay) to a mentee mid-onboarding or a mentor not yet approved (a sign-up, an application
  in review or declined), whatever the flags lock: `inSetup` covers only the setup lock, not
  review or declined.
- **Selection** (pure, `lib/utils/whatsNew.ts`): `tourViewerOf` (null while /me loads and for
  admins; the routing role, `viewerRole`), `releaseFor` (enabled, released from `liveFrom` with
  no end so a late first visit still gets it, audience, role, not seen), `tourMayStart` (the role's Home, not previewing, not in setup, no consent banner),
  `tourSteps` (drop a step whose target is missing; a missing `required` one, or none at all,
  holds the tour), `tourText` (the welcome hint and done card lose their replay line once the
  replay window has ended).
- **Targets by id**: AppShell nav items and CreditsPill carry `data-tour`; the More button
  lists the ids its sheet holds (`data-tour-holds`), and AppShell's `tourMore` holds the sheet
  open for such a step on phones.
- **UI**: `templates/WhatsNewTour` (welcome on ModalShell, step card on useFocusTrap with a
  cut-out scrim, done card as `role="status"`), loaded only when it opens. The host (`app/_shell/WhatsNewHost`, logic in
  `useWhatsNew`) is itself loaded after the page and only in a build with the flag on, so the
  selection, copy and seen list are never in a page's first-load JS (350kB budget).
- **Replay**: "What's new" in the account menu (desktop) and More sheet (phones), and
  Settings' "Replay tour", link to the role's Home with `?tour=replay`, which opens the
  welcome whether seen or not (replay never un-sees; its Skip or Finish counts as seen too,
  which is idempotent: the server's record only grows). Offered per release from `liveFrom` for
  `replayDays` (default 30), or with no end for `replayDays: 'always'` (the Welcome tour, so
  its hint and done card always carry the replay line), same audience rules. Per-user windows (30 days from when each
  person saw it) would need `seen_at` from the backend; deliberately not done.
- **Get the app**: a step marked `install` shows only where the device can install the app
  (`installPlatform`, so never in the installed app or on desktop today), points at the phone's
  More tab, and its Install app button opens the install nudge's own sheet (trigger `tour`).
  The tour and the automatic nudge still never share a visit; the nudge's dismissals stay
  per device in browser storage, never in `seen_items`.
- **Done card**: an optional `doneAction` (label, href) per role leads on (mentors: "Check my
  hours" to Calendar) beside "Got it"; `tour_completed` says which (`cta` or `dismiss`).
- **Seen**: on Not now, Skip, Escape and Finish. Optimistic: the cached `/me` and this tab's
  list for the signed-in viewer (`lib/utils/seenHere`; another viewer starts empty, sign-out
  and an ended session clear it) take it at once, the PUT retries quietly. Nothing in Preview
  as user.
- **Other asks**: the tour checks the visit is free before it loads (`visitFreeForTour`) and
  claims it from the install nudge once it is on screen (`claimVisitForTour`), so a failed load
  costs nobody their ask. While due it holds the mentor push ask; an ask that already had the
  visit makes the tour wait for the next one.

## Consequences

- Good: one place to add a release; seen follows the account across devices; nothing loads
  on pages where no tour is due.
- Good: the same list can carry other one-time things later (quiet "New" badges on a nav item).
- Bad: until the backend releases `seen_items`, no tour shows outside the mock (by design).
- Neutral: a key is forever. Renaming a live release id shows it again to everyone.

## Future options (not built)

- Audience `admin` (an `audience` value and its rule in `inAudience`).
- Quiet "New" badges on a nav item, keyed the same way, instead of a full tour.
