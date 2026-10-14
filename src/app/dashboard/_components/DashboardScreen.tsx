'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/atoms/Button/Button';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { AppShell } from '@/components/templates/AppShell/AppShell';
import { useAppShell } from '@/app/_shell/useAppShell';
import { useMentorDashboard, type SetupNext } from '@/lib/api/data/dashboard';
import { deviceTimeZone, inSentence } from '@/lib/utils/format';
import { useOnline } from '@/lib/utils/useOnline';
import type { Viewer } from '@/types/mentor';
import { DashboardHeader } from './DashboardHeader';
import { NextSessionCard } from './NextSessionCard';
import { SetupBanner, type SetupAction } from './SetupBanner';
import styles from './DashboardScreen.module.css';

type Member = Extract<Viewer, { kind: 'member' }>;

const sharedKey = (id: string) => `ef-dash-shared-${id}`;
function readShared(id: string): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(sharedKey(id)) === '1';
  } catch {
    return false;
  }
}
function persistShared(id: string) {
  try {
    localStorage.setItem(sharedKey(id), '1');
  } catch {
    /* private mode / blocked storage: the step just won't be remembered */
  }
}

function DashboardLoading() {
  return (
    <div className={styles.loading} role="status" aria-busy>
      <span className="sr-only">Loading your dashboard</span>
      <Skeleton width="240px" height="28px" />
      <Skeleton width="320px" height="16px" />
      <Skeleton height="96px" radius="lg" />
    </div>
  );
}

function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles.pageState} role="alert">
      <p className={styles.stateText}>We couldn’t load your dashboard.</p>
      <Button variant="secondary-outlined" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function MentorHome({ member }: { member: Member }) {
  const accountZone = member.timeZone ?? deviceTimeZone();
  const [shared, setShared] = useState(() => readShared(member.id));
  // Keyed so a repeated identical message still re-announces (LiveRegion).
  const [announce, setAnnounce] = useState<{ text: string; id: number } | null>(null);
  const say = (text: string) => setAnnounce((a) => ({ text, id: (a?.id ?? 0) + 1 }));
  const dash = useMentorDashboard(member, accountZone, shared);

  const copyShareLink = (url: string) => {
    if (!url || !navigator.clipboard) {
      say('Couldn’t copy the link');
      return;
    }
    navigator.clipboard.writeText(url).then(
      () => {
        setShared(true);
        persistShared(member.id);
        say('Link copied');
      },
      () => say('Couldn’t copy the link'),
    );
  };

  // Error before loading, so a profile failure shows at once even while a
  // secondary query is still retrying; then the settled-but-empty case (e.g. a
  // 404 on the owner profile) falls through to the error state, never a crash.
  if (dash.error) return <DashboardError onRetry={dash.retry} />;
  if (dash.isLoading) return <DashboardLoading />;
  if (!dash.data) return <DashboardError onRetry={dash.retry} />;
  const d = dash.data;

  const toAction = (next: SetupNext, shareUrl: string): SetupAction =>
    'href' in next.action
      ? { label: next.action.label, href: next.action.href }
      : { label: next.action.label, onClick: () => copyShareLink(shareUrl) };

  return (
    <>
      <DashboardHeader
        name={d.firstName}
        subline={d.isNew ? 'Let’s get your first session booked.' : 'Here’s how your mentoring is going.'}
        shareUrl={d.shareUrl}
        shareName={d.shareName}
      />
      {d.isNew && d.setup.next ? (
        <SetupBanner
          doneCount={d.setup.doneCount}
          total={d.setup.total}
          pct={d.setup.pct}
          nextTitle={inSentence(d.setup.next.title)}
          action={toAction(d.setup.next, d.shareUrl)}
        />
      ) : (
        // Also the interim for a new mentor who has finished setup, until the
        // activation hero ships: a useful next-session / empty state, not a bare page.
        <NextSessionCard
          isLoading={dash.nextSession.isLoading}
          error={dash.nextSession.error}
          onRetry={dash.nextSession.retry}
          booking={dash.nextSession.data}
          timeZone={accountZone}
          now={new Date()}
        />
      )}
      <LiveRegion message={announce} />
    </>
  );
}

/**
 * Mentor Dashboard (home), the route every mentor lands on (homeFor →
 * /dashboard). Only mentors belong here; anyone else is bounced to '/', which
 * routes them to their own home. PR A ships the frame + activation setup banner
 * + next-session card; the activation hero and metrics follow.
 */
export function DashboardScreen() {
  const { member, chrome, account, nav } = useAppShell();
  const online = useOnline();
  const router = useRouter();

  // Viewer resolved (guest or member) but not a mentor → send them home.
  const resolved = chrome !== 'pending';
  const isMentor = !!member?.isMentor;
  useEffect(() => {
    if (resolved && !isMentor) router.replace('/');
  }, [resolved, isMentor, router]);

  return (
    <AppShell active="Home" nav={nav} chrome={chrome} account={account} offline={!online}>
      <div className={styles.page}>
        {member?.isMentor ? <MentorHome member={member} /> : <DashboardLoading />}
      </div>
    </AppShell>
  );
}
