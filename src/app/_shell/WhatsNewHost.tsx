'use client';

import { useEffect } from 'react';
import { lazyPart } from '@/components/molecules/LazyPart/lazyPart';
import { tourReplay, useWhatsNew } from './useWhatsNew';
import type { Access } from '@/lib/utils/access';
import type { Viewer } from '@/types/mentor';

// The tour itself loads when it opens. A failed load closes it, unmarked, so it can come back.
const WhatsNewTour = lazyPart(
  () => import('@/components/templates/WhatsNewTour/WhatsNewTour').then((m) => m.WhatsNewTour),
  { close: (p) => p.onClose() },
);

/** What the shell needs back: the More sheet held open, other asks held, the menu's replay item. */
export type WhatsNewShellState = {
  more: boolean;
  holding: boolean;
  menuItem?: { label: string; href: string };
};

export const WHATS_NEW_OFF: WhatsNewShellState = { more: false, holding: false };

/**
 * The What's new tour's host, loaded after the page (never in its first-load
 * JS, ADR 0014) and only in a build with the flag on: the selection, the copy
 * and the seen list come with it. It tells the shell what it needs through
 * `onState` and draws the tour when one is open.
 */
export function WhatsNewHost({
  member,
  access,
  previewing,
  pathname,
  onState,
}: {
  member: Extract<Viewer, { kind: 'member' }> | null;
  access: Access;
  previewing: boolean;
  pathname: string;
  onState: (s: WhatsNewShellState) => void;
}) {
  const w = useWhatsNew({ member, access, previewing, pathname });
  const replay = tourReplay(member, previewing);
  const href = replay?.href;
  // The release's own name for it: "What's new", or "Welcome tour".
  const label = replay?.labels.menuItem;
  useEffect(() => {
    onState({
      more: w.more,
      holding: w.holding,
      menuItem: href && label ? { label, href } : undefined,
    });
  }, [w.more, w.holding, href, label, onState]);
  // Gone (a failed load, a flag change): the shell goes back to no tour.
  useEffect(() => () => onState(WHATS_NEW_OFF), [onState]);
  return w.tour ? <WhatsNewTour {...w.tour} /> : null;
}
