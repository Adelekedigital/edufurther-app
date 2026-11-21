import { WHATS_NEW_LIVE } from '@/lib/config/whatsNew';
import { viewerRole } from '@/lib/utils/access';
import type { Viewer } from '@/types/mentor';
import type { InstallPlatform } from '@/lib/analytics/events';
import {
  TOUR_COPY,
  TOUR_RELEASES,
  type TourRelease,
  type TourRole,
  type TourRoleContent,
  type TourStep,
  type TourTarget,
} from '@/lib/copy/whatsNew';

/**
 * The releases that may show at all: none while the global switch
 * (NEXT_PUBLIC_WHATS_NEW_ENABLED, read at build time, so a change needs a
 * redeploy) is off, else each release that is itself `enabled`. Every caller
 * selects from this, so off means no tour, no menu item and no Settings row.
 */
export function activeReleases(
  on: boolean = WHATS_NEW_LIVE,
  all: readonly TourRelease[] = TOUR_RELEASES,
): readonly TourRelease[] {
  return on ? all.filter((r) => r.enabled) : [];
}

/**
 * "What's new" tours, the pure half (ADR 0014): which release a viewer gets,
 * whether it may start now, and which of its steps can be shown. No DOM, no
 * React: the tour host measures the page and passes the answers in.
 */

/** The backend's rule for a seen key (PUT /me/seen-items/{key}); anything else is a 422. */
export const SEEN_KEY = /^[a-z0-9][a-z0-9:._-]{0,79}$/;

/** Each role's Home, the only page a tour starts on. */
export const TOUR_HOME: Record<TourRole, string> = { mentee: '/home', mentor: '/dashboard' };

/** What selection needs to know about the viewer. */
export type TourViewer = {
  /** Null while unknown, and for anyone a tour is never for (admins). */
  role: TourRole | null;
  isMigrated?: boolean;
  /** `/me.seen_items`; undefined from a /me that predates it, which shows nothing. */
  seenItems?: readonly string[];
};

/**
 * The tour's view of the signed-in viewer, or null when no tour can be for
 * them yet: /me still loading (or a guest), or a platform admin. The role is
 * the routing one (`viewerRole`, as accessFor and memberHome read it): a
 * mentor, a mentor sign-up while mentor onboarding is on, else a mentee.
 */
export function tourViewerOf(viewer: Viewer): (TourViewer & { id: string }) | null {
  if (viewer.kind !== 'member' || viewer.isAdmin) return null;
  return {
    id: viewer.id,
    role: viewerRole(viewer),
    isMigrated: viewer.isMigrated,
    seenItems: viewer.seenItems,
  };
}

/** Released: its day (UTC midnight) has come. An unreadable date never has. */
export function isReleased(r: TourRelease, now: number): boolean {
  const from = Date.parse(r.liveFrom);
  return !Number.isNaN(from) && now >= from;
}

/**
 * The release this viewer should see: enabled, released (from `liveFrom`,
 * with no end: a late first visit still gets it), for their audience and
 * role, with a valid id, and not seen (on the account, or here this visit).
 * The first such release in `releases` wins. Replays ignore the seen list.
 */
export function releaseFor(
  viewer: TourViewer,
  releases: readonly TourRelease[],
  seenHere: ReadonlySet<string> = new Set(),
  replay = false,
  now = Date.now(),
): TourRelease | null {
  const { role } = viewer;
  if (!role) return null;
  // No list yet: we couldn't record the answer, so it would come back every visit.
  if (!viewer.seenItems && !replay) return null;
  const seen = new Set([...(viewer.seenItems ?? []), ...seenHere]);
  return (
    releases.find(
      (r) =>
        r.enabled &&
        isReleased(r, now) &&
        SEEN_KEY.test(r.id) &&
        !!r.roles[role] &&
        inAudience(r, viewer) &&
        (replay || !seen.has(r.id)),
    ) ?? null
  );
}

/** How long "Replay tour" is offered after a release goes live, unless it says otherwise. */
export const REPLAY_DAYS = 30;
const DAY_MS = 86_400_000;

/** From its release day (UTC midnight) for `replayDays`; an unreadable date is never. */
export function inReplayWindow(r: TourRelease, now: number): boolean {
  const from = Date.parse(r.liveFrom);
  if (Number.isNaN(from)) return false;
  return now >= from && now < from + (r.replayDays ?? REPLAY_DAYS) * DAY_MS;
}

/** The query that asks Home to replay the tour from its welcome (seen stays seen). */
export const REPLAY_PARAM = 'tour';
export const REPLAY_VALUE = 'replay';

/**
 * Where "Replay tour" / "What's new" goes for this viewer, or undefined while
 * no release is in its replay window for them (same audience rules as the
 * tour, seen or not). Per release, not per person: a per-person window would
 * need the backend's seen time.
 */
export function replayHref(
  viewer: TourViewer,
  releases: readonly TourRelease[],
  now: number,
): string | undefined {
  const r = releaseFor(viewer, releases, undefined, true, now);
  if (!r || !viewer.role || !inReplayWindow(r, now)) return undefined;
  return `${TOUR_HOME[viewer.role]}?${REPLAY_PARAM}=${REPLAY_VALUE}`;
}

/**
 * The words that point at the replay go once it is no longer offered: the
 * welcome's hint and the done card's body, with or without their replay line.
 */
export function tourText(content: TourRoleContent, replayable: boolean) {
  const add = (text: string, line: string) => (replayable ? `${text} ${line}` : text);
  return {
    hint: add(TOUR_COPY.hint, TOUR_COPY.welcomeReplay),
    doneBody: add(content.done.body, TOUR_COPY.doneReplay),
  };
}

function inAudience(r: TourRelease, v: TourViewer): boolean {
  switch (r.audience) {
    case 'migrated':
      return v.isMigrated === true;
  }
}

/** Everything else that must hold before a tour opens by itself. */
export type TourMoment = {
  pathname: string;
  role: TourRole | null;
  previewing: boolean;
  /** Onboarding or the setup lock (accessFor). */
  inSetup: boolean;
  /** The analytics consent banner is up and unanswered. */
  consentBanner: boolean;
  /** Another ask holds this visit (the install nudge is up, or showed already). */
  otherAsk: boolean;
};

/** The tour may open now: on the role's Home, nothing else asking first. */
export function tourMayStart(m: TourMoment): boolean {
  return (
    !!m.role &&
    m.pathname === TOUR_HOME[m.role] &&
    !m.previewing &&
    !m.inSetup &&
    !m.consentBanner &&
    !m.otherAsk
  );
}

/**
 * Where a target is on this page: `shown` (visible now), `more` (a phone nav
 * item that lives in the More sheet, which the step opens), or null (absent,
 * e.g. no credits pill for a mentee without credits).
 */
export type TargetPlace = 'shown' | 'more' | null;

/** `center`: an install step with nothing to point at (desktop): the card sits centred. */
export type ResolvedStep = TourStep & {
  place: Exclude<TargetPlace, null> | 'center';
  body: string;
};

/**
 * The steps this viewer can follow, in order. A missing optional step is
 * dropped (the count then reads "of N" without it); a missing required step
 * holds the whole tour back (null), as does no step at all. Phones read `phoneBody` when there is one.
 * An install step shows only where the app can be installed (`install`, from
 * lib/pwa/installPrompt's installPlatform); on iPhone it adds Safari's steps.
 */
export function tourSteps(
  content: TourRoleContent,
  placeOf: (t: TourTarget) => TargetPlace,
  phone: boolean,
  install: InstallPlatform | null = null,
): ResolvedStep[] | null {
  const out: ResolvedStep[] = [];
  for (const s of content.steps) {
    if (s.install && !install) continue;
    const place = placeOf(s.target) ?? (s.install ? 'center' : null);
    if (!place) {
      if (s.required) return null;
      continue;
    }
    const body = phone && s.phoneBody ? s.phoneBody : s.body;
    out.push({
      ...s,
      place,
      body: s.install && install === 'ios' ? `${body} ${TOUR_COPY.iosInstallHint}` : body,
    });
  }
  // Nothing to point at: no guided steps (the welcome goes straight to done).
  return out.length > 0 ? out : null;
}
