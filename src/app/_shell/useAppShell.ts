'use client';

import type { AccountMenuItem } from '@/components/molecules/AccountMenu/AccountMenu';
import { useSignOut } from '@/lib/api/data/auth';
import { useViewer } from '@/lib/api/data/viewer';
import { canBookFor } from './bookBlocked';
import type { Viewer } from '@/types/mentor';

/**
 * "Find my mentor matches" goes to an external Cal booking page for now (product
 * decision, 2026-09-26). TEMPORARY: matching must move onto the platform — see
 * project-conventions → Known rough edges. Unset → the prompt is not rendered.
 */
export const MATCH_CALL_URL = process.env.NEXT_PUBLIC_MATCH_CALL_URL ?? '';

export type ShellChrome = 'guest' | 'member' | 'pending';

/** Which AppShell chrome a viewer gets: nothing is promised before /me answers. */
export function chromeFor(viewer: Viewer): ShellChrome {
  if (viewer.kind === 'guest') return 'guest';
  if (
    viewer.kind === 'member' ||
    viewer.kind === 'unlinked' ||
    viewer.kind === 'accountExists' ||
    viewer.kind === 'error' ||
    (viewer.kind === 'loading' && viewer.signedIn)
  )
    return 'member';
  return 'pending';
}

type Member = Extract<Viewer, { kind: 'member' }>;

/**
 * The account menu (AppShell.dc.html `menuItems`), in the design's order:
 * View profile, Find my mentor matches, Logout. "View profile" is the viewer's
 * own Mentor Profile, so mentors only: mentees have no profile page yet (#50).
 * "Feedback" has no destination yet (#51).
 */
export function accountItems(member: Member | null, signOut: () => void): AccountMenuItem[] {
  return [
    ...(member?.isMentor
      ? [
          {
            key: 'profile',
            label: 'View profile',
            icon: 'account_box' as const,
            href: `/mentors/${encodeURIComponent(member.id)}`,
          },
        ]
      : []),
    // Only once we know the viewer is a mentee (or a new member, not a mentor).
    ...(MATCH_CALL_URL && member && (member.isMentee || !member.isApprovedMentor)
      ? [
          {
            key: 'matches',
            label: 'Find my mentor matches',
            icon: 'route' as const,
            href: MATCH_CALL_URL,
            external: true,
          },
        ]
      : []),
    {
      key: 'logout',
      label: 'Logout',
      icon: 'logout',
      danger: true,
      onSelect: signOut,
    },
  ];
}

/**
 * Everything a screen passes to AppShell about the viewer, shared so Explore
 * and Mentor Profile can't drift. Notifications wait (no backend).
 */
export function useAppShell() {
  const viewer = useViewer();
  const signOut = useSignOut();
  const chrome = chromeFor(viewer);
  const member = viewer.kind === 'member' ? viewer : null;
  const items = accountItems(member, () => void signOut());
  return {
    viewer,
    member,
    chrome,
    // Design AppShell `role`: any mentor profile gets the mentor nav, which has
    // no Explore (product, 2026-09-28). Unknown until /me answers.
    nav: !member
      ? ('unknown' as const)
      : member.isMentor
        ? ('mentor' as const)
        : ('mentee' as const),
    /** Mentors can't book (product, 2026-09-29): "View profile" instead of Book. */
    canBook: canBookFor(viewer),
    account: chrome === 'member' ? { initial: member?.initial ?? '', items } : undefined,
  };
}
