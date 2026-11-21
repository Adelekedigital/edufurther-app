import type {
  TourRelease,
  TourRole,
  TourRoleContent,
  TourStep,
  TourTarget,
} from '@/lib/copy/whatsNew';

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
 * The release this viewer should see: live, for their audience and role, with
 * a valid id, and not seen (on the account, or here this visit). The first
 * such release in `releases` wins. Replays ignore the seen list (`replay`).
 */
export function releaseFor(
  viewer: TourViewer,
  releases: readonly TourRelease[],
  seenHere: ReadonlySet<string> = new Set(),
  replay = false,
): TourRelease | null {
  const { role } = viewer;
  if (!role) return null;
  // No list yet: we couldn't record the answer, so it would come back every visit.
  if (!viewer.seenItems && !replay) return null;
  const seen = new Set([...(viewer.seenItems ?? []), ...seenHere]);
  return (
    releases.find(
      (r) =>
        r.live &&
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
  const r = releaseFor(viewer, releases, undefined, true);
  if (!r || !viewer.role || !inReplayWindow(r, now)) return undefined;
  return `${TOUR_HOME[viewer.role]}?${REPLAY_PARAM}=${REPLAY_VALUE}`;
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

export type ResolvedStep = TourStep & { place: Exclude<TargetPlace, null>; body: string };

/**
 * The steps this viewer can follow, in order. A missing optional step is
 * dropped (the count then reads "of N" without it); a missing required step
 * holds the whole tour back (null). Phones read `phoneBody` when there is one.
 */
export function tourSteps(
  content: TourRoleContent,
  placeOf: (t: TourTarget) => TargetPlace,
  phone: boolean,
): ResolvedStep[] | null {
  const out: ResolvedStep[] = [];
  for (const s of content.steps) {
    const place = placeOf(s.target);
    if (!place) {
      if (s.required) return null;
      continue;
    }
    out.push({ ...s, place, body: phone && s.phoneBody ? s.phoneBody : s.body });
  }
  return out;
}
