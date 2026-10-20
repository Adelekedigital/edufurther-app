'use client';

import { MENTOR_ONBOARDING_LIVE } from '@/lib/config/auth';
import { useState } from 'react';
import type { AccountMenuItem } from '@/components/molecules/AccountMenu/AccountMenu';
import { useSignOut } from '@/lib/api/data/auth';
import { useViewer } from '@/lib/api/data/viewer';
import { accessFor, inSetup, setupCredits, type Access } from '@/lib/utils/access';
import { personCover } from '@/lib/utils/person';
import { creditsView } from '@/lib/utils/credits';
import { hasUnsavedChanges } from '@/lib/utils/leaveGuard';
import { canBookFor } from './bookBlocked';
import type { Viewer } from '@/types/mentor';

/**
 * The team-call booking page (Cal): a free 1-on-1 call with someone from the
 * EduFurther team, who helps a mentee decide where to start and suggests
 * mentors. Its own purpose, not a stand-in for matching (owner, 2026-10-17).
 * Unset → the prompt, pill and menu link are not rendered.
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
 * Who gets "Talk to our team" (account menu, Explore's prompt): mentees,
 * and new members with no goal yet. A mentor profile in any state, pending
 * included, is a mentor: one role per account (product, 2026-09-29/30).
 */
export function isMenteeSide(member: Member | null): member is Member {
  // A mentor sign-up is becoming a mentor, not looking for one (while mentor
  // onboarding is on; off, they're treated as a mentee).
  return !!member && !member.isMentor && !(member.signedUpAsMentor && MENTOR_ONBOARDING_LIVE);
}

/**
 * The account menu (AppShell.dc.html `menuItems`), in the design's order:
 * View profile, Talk to our team, Logout. "View profile" is the viewer's
 * own Mentor Profile, so mentors only: mentees have no profile page yet (#50).
 * "Feedback" has no destination yet (#51).
 */
export function accountItems(
  member: Member | null,
  signOut: () => void,
  /** In setup the profile isn't theirs to see yet (the setup lock): no "View profile". */
  access?: Access,
): AccountMenuItem[] {
  return [
    ...(member?.isMentor && !(access && inSetup(access))
      ? [
          {
            key: 'profile',
            label: 'View profile',
            icon: 'account_box' as const,
            href: `/mentors/${encodeURIComponent(member.id)}`,
          },
        ]
      : []),
    ...(MATCH_CALL_URL && isMenteeSide(member)
      ? [
          {
            key: 'matches',
            label: 'Talk to our team',
            icon: 'support_agent' as const,
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
  // Logout with unsaved changes asks first: the browser's own prompt would
  // only come after the session had ended (review of PR 127).
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const chrome = chromeFor(viewer);
  const member = viewer.kind === 'member' ? viewer : null;
  // The setup lock: nav items held until onboarding or approval (lib/utils/access).
  const access = accessFor(viewer);
  const items = accountItems(
    member,
    () => {
      if (hasUnsavedChanges()) setConfirmingLogout(true);
      else void signOut();
    },
    access,
  );
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
    access,
    account:
      chrome === 'member'
        ? {
            avatar: {
              initials: member?.initials ?? '',
              src: member?.avatarUrl ?? null,
              focus: member?.avatarFocus ?? null,
              // Same colour as their profile's banner and photo circle.
              cover: personCover(member?.id ?? '', member?.coverKey),
            },
            items,
            /** Mentees only: their monthly credits (AppShell.dc.html creditsIn=both). */
            // In setup the starter credit isn't paid yet (it is at completion): 0.
            // A mentor sign-up in setup isn't a mentee: no mentee credits.
            credits:
              isMenteeSide(member) && access.state !== 'mentorSetup'
                ? (creditsView(
                    member.credits && access.state === 'menteeSetup'
                      ? setupCredits(member.credits)
                      : member.credits,
                    undefined,
                    member.menteeCancelRefundHours,
                    member.completedSessions,
                  ) ?? undefined)
                : undefined,
            /** Bookings badge: requests awaiting a response (product, 2026-09-30). */
            counts: countsFor(member),
            logoutConfirm: confirmingLogout
              ? {
                  onKeep: () => setConfirmingLogout(false),
                  onLogout: () => {
                    setConfirmingLogout(false);
                    void signOut();
                  },
                }
              : undefined,
          }
        : undefined,
  };
}

/** The nav's count badges. Only Bookings has one; Messages waits (hidden). */
export function countsFor(member: Extract<Viewer, { kind: 'member' }> | null) {
  const n = member?.awaitingResponse ?? 0;
  if (!member || n <= 0) return {};
  const who = member.isMentor ? 'awaiting your response' : 'awaiting the mentor';
  return { Bookings: { count: n, label: `${n} ${n === 1 ? 'request' : 'requests'} ${who}` } };
}
