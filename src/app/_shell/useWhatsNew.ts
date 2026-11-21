'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useConsentBannerShown } from '@/lib/analytics/bannerState';
import type { InstallPlatform } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';
import { installPlatform, openInstallNudge } from '@/lib/pwa/installPrompt';
import { useMarkSeen, useSeenHere } from '@/lib/api/data/seenItems';
import type { TourLabels, TourReleaseId, TourRole, TourRoleContent } from '@/lib/copy/whatsNew';
import { inSetup, type Access } from '@/lib/utils/access';
import {
  activeReleases,
  inReplayWindow,
  releaseFor,
  REPLAY_PARAM,
  REPLAY_VALUE,
  replayFor,
  TOUR_HOME,
  tourLabels,
  tourMayStart,
  tourViewerOf,
  type TourReplay,
} from '@/lib/utils/whatsNew';
import type { TourEvent } from '@/components/templates/WhatsNewTour/WhatsNewTour';
import type { Viewer } from '@/types/mentor';

type Member = Extract<Viewer, { kind: 'member' }>;

/**
 * The "What's new" tour's host (ADR 0014), used once in the (app) layout:
 * whether a release is due for this viewer, when it may open, and what each
 * answer does (seen list, analytics). The tour itself is presentational
 * (templates/WhatsNewTour) and loads only when it opens.
 */

/** A beat after Home settles, so the page and any banner are drawn first. */
export const SETTLE_MS = 800;
/** Another dialog is open: look again after this. */
const RECHECK_MS = 1_000;

/**
 * "Replay tour" and the "What's new" menu item link to Home with
 * `?tour=replay`: the tour opens at its welcome, and the query is dropped from
 * the address so a reload or Back doesn't replay it again.
 */
function useReplayAsked(): [boolean, (on: boolean) => void] {
  const asked = useSearchParams()?.get(REPLAY_PARAM) === REPLAY_VALUE;
  const [replay, setReplay] = useState(false);
  // Latched as the query arrives (during render, not in an effect), so it
  // outlives the query being dropped below.
  const [wasAsked, setWasAsked] = useState(false);
  if (asked !== wasAsked) {
    setWasAsked(asked);
    if (asked) setReplay(true);
  }
  useEffect(() => {
    if (!asked) return;
    const url = new URL(window.location.href);
    url.searchParams.delete(REPLAY_PARAM);
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }, [asked]);
  return [replay, setReplay];
}

type Active = {
  release: TourReleaseId;
  role: TourRole;
  content: TourRoleContent;
  /** The release's own badge and title (the welcome). */
  labels: TourLabels;
  replay: boolean;
  /** How this device installs the app, read as the tour opens (Get the app). */
  install: InstallPlatform | null;
  /** Still in its replay window: the hint and done card say it can be replayed. */
  replayable: boolean;
};

export function useWhatsNew({
  member,
  access,
  previewing,
  pathname,
}: {
  member: Member | null;
  access: Access;
  previewing: boolean;
  pathname: string;
}) {
  const viewer = member ? tourViewerOf(member) : null;
  const role = viewer?.role ?? null;
  const seenHere = useSeenHere(viewer?.id ?? null);
  const [replay, setReplay] = useReplayAsked();
  const consentBanner = useConsentBannerShown();
  const markSeen = useMarkSeen(viewer?.id ?? null);
  const release = viewer ? releaseFor(viewer, activeReleases(), seenHere, replay) : null;
  const may =
    !!release &&
    tourMayStart({
      pathname,
      role,
      previewing,
      inSetup: inSetup(access),
      consentBanner,
      otherAsk: false,
    });

  const [active, setActive] = useState<Active | null>(null);
  // A replay asked for on Home ends when they leave it unopened (seen stays seen).
  if (replay && !active && role && pathname !== TOUR_HOME[role]) setReplay(false);
  // Another ask (the install nudge, the push ask) had this visit already.
  const [heldOff, setHeldOff] = useState(false);
  const [more, setMore] = useState(false);
  const waiting = may && !active && (!heldOff || replay);

  useEffect(() => {
    if (!waiting || !release || !role) return;
    let gone = false;
    let timer: ReturnType<typeof setTimeout>;
    const attempt = async () => {
      if (gone) return;
      // Never over another dialog (a booking, a lock explainer): try again later.
      if (document.querySelector('[aria-modal="true"]')) {
        timer = setTimeout(attempt, RECHECK_MS);
        return;
      }
      if (!replay) {
        try {
          const nudge = await import('@/lib/pwa/installNudge');
          if (gone) return;
          // Checked now, claimed once the tour is on screen ('opened'): a load
          // that fails never costs the install or push ask its visit.
          if (!nudge.visitFreeForTour()) {
            setHeldOff(true);
            return;
          }
        } catch {
          return;
        }
      }
      const content = release.roles[role];
      if (!gone && content)
        setActive({
          release: release.id,
          role,
          content,
          labels: tourLabels(release),
          replay,
          install: installPlatform(),
          replayable: inReplayWindow(release, Date.now()),
        });
    };
    timer = setTimeout(attempt, SETTLE_MS);
    return () => {
      gone = true;
      clearTimeout(timer);
    };
  }, [waiting, release, role, replay]);

  const onEvent = useCallback(
    (e: TourEvent) => {
      if (!active) return;
      const base = { release: active.release, role: active.role };
      switch (e.type) {
        case 'opened':
          if (!active.replay)
            void import('@/lib/pwa/installNudge').then(
              (n) => n.claimVisitForTour(),
              () => {},
            );
          return;
        case 'started':
          track('tour_started', { ...base, replay: active.replay });
          return;
        case 'step':
          track('tour_step_viewed', { ...base, step: e.step, target: e.target });
          return;
        case 'skipped':
          track('tour_skipped', { ...base, step: e.step });
          markSeen(active.release);
          return;
        case 'finished':
          markSeen(active.release);
          return;
        case 'completed':
          track('tour_completed', { ...base, action: e.action });
      }
    },
    [active, markSeen],
  );
  const onClose = useCallback(() => {
    setActive(null);
    setMore(false);
    setReplay(false);
  }, [setReplay]);

  return {
    /** The tour to draw, with its handlers; null when none is open. */
    tour: active && {
      first: member?.firstName ?? '',
      content: active.content,
      labels: active.labels,
      onEvent,
      onMore: setMore,
      install: active.install,
      replayable: active.replayable,
      // The install nudge's own sheet and analytics (trigger `tour`), never a second one.
      onInstall: () => void openInstallNudge('tour'),
      onClose,
    },
    /** The shell holds its More sheet open for this step (AppShell `tourMore`). */
    more,
    /** Due on this page, or open: other asks (the push ask) hold back. */
    holding: waiting || !!active,
  };
}

/**
 * Where Settings' "Replay tour" and the account menu's item go, with the words
 * that release uses for them ("What's new", "Welcome tour"): the role's Home,
 * replaying from the welcome (seen stays seen). Undefined outside the
 * release's replay window, in Preview as user, or for anyone it isn't for.
 */
export function tourReplay(
  member: Member | null,
  previewing: boolean,
  now = Date.now(),
): TourReplay | undefined {
  const viewer = member && !previewing ? tourViewerOf(member) : null;
  return viewer ? replayFor(viewer, activeReleases(), now) : undefined;
}
