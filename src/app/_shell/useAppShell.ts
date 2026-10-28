'use client';

import { MENTOR_ONBOARDING_LIVE } from '@/lib/config/auth';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import type { AccountMenuItem } from '@/components/molecules/AccountMenu/AccountMenu';
import { useAdminSummary } from '@/lib/api/data/admin';
import { useSignOut } from '@/lib/api/data/auth';
import { useUnreadTotal } from '@/lib/api/data/messages';
import { MESSAGES_LIVE } from '@/lib/config/messages';
import { LIST_COPY } from '@/lib/copy/messages';
import { useViewer } from '@/lib/api/data/viewer';
import { accessFor, inSetup, isUnder, setupCredits, type Access } from '@/lib/utils/access';
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
  const admin = member?.isAdmin ? member : null;
  // Inside /admin an admin gets the admin nav; its Mentors badge counts the
  // applications waiting (Admin PRD, Access).
  const pathname = usePathname();
  const inAdmin = !!admin && isUnder(pathname ?? '', '/admin');
  // Only inside /admin: the badge shows nowhere else.
  const summary = useAdminSummary(inAdmin ? admin.id : null);
  // The setup lock: nav items held until onboarding or approval (lib/utils/access).
  const access = accessFor(viewer);
  // The Messages badge: total unread, every 30 s app-wide, for a member who can
  // open Messages (a locked item shows no count, so it asks nothing).
  const unread = useUnreadTotal(MESSAGES_LIVE && !!member && !access.locked.has('Messages'));
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
      : inAdmin
        ? ('admin' as const)
        : member.isMentor
          ? ('mentor' as const)
          : ('mentee' as const),
    adminEntry: !!admin,
    /** Messages is on: the nav shows its item (AppShell `messages`). */
    messages: MESSAGES_LIVE,
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
              // Not inside /admin: mentee credits aren't admin chrome.
              !inAdmin && isMenteeSide(member) && access.state !== 'mentorSetup'
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
            counts: inAdmin
              ? adminCounts(summary.data?.counts.applications)
              : countsFor(member, MESSAGES_LIVE ? unread : null),
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

/** The admin nav's badge: applications waiting, on Mentors. */
export function adminCounts(waiting: number | undefined) {
  if (!waiting || waiting <= 0) return {};
  return {
    Mentors: {
      count: waiting,
      label: `${waiting} ${waiting === 1 ? 'application' : 'applications'} waiting`,
    },
  };
}

/**
 * The nav's count badges: Bookings, requests awaiting a response; Messages,
 * total unread (`unread`, null while unknown or off).
 */
export function countsFor(
  member: Extract<Viewer, { kind: 'member' }> | null,
  unread: number | null = null,
) {
  if (!member) return {};
  const n = member.awaitingResponse ?? 0;
  const who = member.isMentor ? 'awaiting your response' : 'awaiting the mentor';
  return {
    ...(n > 0 && {
      Bookings: { count: n, label: `${n} ${n === 1 ? 'request' : 'requests'} ${who}` },
    }),
    ...(unread !== null &&
      unread > 0 && { Messages: { count: unread, label: LIST_COPY.navCount(unread) } }),
  };
}
