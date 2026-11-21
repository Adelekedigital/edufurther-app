'use client';

import { useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AppShell } from '@/components/templates/AppShell/AppShell';
import { PushPrompt } from '@/app/_shell/PushPrompt';
import { RoleRedirect } from '@/app/_shell/RoleRedirect';
import { useAppShell } from '@/app/_shell/useAppShell';
import { lazyPart } from '@/components/molecules/LazyPart/lazyPart';
import type { WhatsNewShellState } from '@/app/_shell/WhatsNewHost';
import { WHATS_NEW_LIVE } from '@/lib/config/whatsNew';
import { useOnline } from '@/lib/utils/useOnline';
import { openInstallNudge, useInstallAvailable } from '@/lib/pwa/installPrompt';

/**
 * Which nav item the current route is, by its first path segment. The shell is
 * mounted once in this layout (ADR 0007), so `active` is derived from the
 * pathname rather than passed per screen. `/dashboard` and the (unbuilt)
 * `/home` are both Home; the rest map to their nav label. `home` and `settings`
 * are forward-looking — neither route is live in the group yet (mentee Home
 * resolves to `/explore`, `/settings` isn't built) — kept so `active` is already
 * right when they ship.
 */
const ACTIVE_BY_SEGMENT: Record<string, string> = {
  dashboard: 'Home',
  home: 'Home',
  // Home opens the application for a mentor in review, declined or newly approved.
  'mentor-application': 'Home',
  bookings: 'Bookings',
  messages: 'Messages',
  calendar: 'Calendar',
  explore: 'Explore',
  // A mentor's profile is reached from Explore, so Explore stays lit there.
  mentors: 'Explore',
  integrations: 'Integration',
  'session-types': 'Sessions',
  settings: 'Settings',
};

// The What's new tour's host loads after the page, never in its first-load JS
// (350kB budget): its selection, copy and seen list come with it. Quiet: a
// failed load just means no tour this time, with no toast and no Notice.
const WhatsNewHost = lazyPart(
  () => import('@/app/_shell/WhatsNewHost').then((m) => m.WhatsNewHost),
  { quiet: true },
);
const WHATS_NEW_OFF: WhatsNewShellState = { more: false, holding: false };

/** The admin app's pages, by their segment under `/admin`. */
const ADMIN_ACTIVE: Record<string, string> = {
  analytics: 'Analytics',
  mentors: 'Mentors',
  credits: 'Credits',
  emails: 'Emails',
};

/** Home or Bookings: where a mentor with bookings may be asked about notifications. */
export function onHomeOrBookings(pathname: string): boolean {
  const nav = activeFor(pathname);
  return nav === 'Home' || nav === 'Bookings';
}

/** At least one booking, upcoming or pending, by /me's counts. */
function hasBookings(member: {
  bookingCounts?: { pending: number | null; upcoming: number | null };
}) {
  const c = member.bookingCounts;
  return (c?.pending ?? 0) + (c?.upcoming ?? 0) > 0;
}

export function activeFor(pathname: string): string {
  const [, segment = '', sub = ''] = pathname.split('/');
  if (segment === 'admin') return ADMIN_ACTIVE[sub] ?? '';
  return ACTIVE_BY_SEGMENT[segment] ?? '';
}

/**
 * The app shell, rendered once for every route in this group (Dashboard,
 * Bookings, Calendar, Explore, a mentor profile, Integrations, Session types). It stays mounted
 * while the user moves between these routes — only `children` changes — so the
 * sidebar, header and account menu never unmount and the screen never blanks
 * (ADR 0007). Viewer-aware through `useAppShell` exactly as the per-screen
 * shell was: guest chrome for guests, member chrome for members, the mentor or
 * mentee nav, the account menu and credits. A page for the other role renders
 * nothing and redirects (RoleRedirect, ROUTE_ROLES); the shell stays.
 */
export default function AppGroupLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // What the tour's host (loaded later) tells the shell; nothing until then.
  const [whatsNew, setWhatsNew] = useState<WhatsNewShellState>(WHATS_NEW_OFF);
  const {
    chrome,
    account,
    nav,
    access,
    messages,
    adminEmails,
    adminAnalytics,
    onPreview,
    member,
    previewing,
  } = useAppShell(whatsNew.menuItem);
  const online = useOnline();
  // A phone browser that can install (lib/pwa/installPrompt): More's last item.
  const installable = useInstallAvailable();

  return (
    <AppShell
      active={activeFor(pathname)}
      nav={nav}
      messages={messages}
      adminEmails={adminEmails}
      adminAnalytics={adminAnalytics}
      chrome={chrome}
      account={account}
      access={access}
      onPreview={onPreview}
      onInstall={chrome === 'member' && installable ? openInstallNudge : undefined}
      tourMore={whatsNew.more}
      offline={!online}
    >
      <RoleRedirect>{children}</RoleRedirect>
      {WHATS_NEW_LIVE && chrome === 'member' && (
        <WhatsNewHost
          member={member}
          access={access}
          previewing={previewing}
          pathname={pathname}
          onState={setWhatsNew}
        />
      )}
      <PushPrompt
        userId={member?.id ?? null}
        // The What's new tour has Home first; the ask waits for another moment.
        mentorWithBookings={
          !!member?.isMentor &&
          onHomeOrBookings(pathname) &&
          hasBookings(member) &&
          !whatsNew.holding
        }
      />
    </AppShell>
  );
}
