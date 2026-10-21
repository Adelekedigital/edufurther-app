'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/atoms/Button/Button';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { CalendarReconnectBanner } from '@/components/molecules/CalendarReconnectBanner/CalendarReconnectBanner';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { useAppShell } from '@/app/_shell/useAppShell';
import { useCalendarReconnect } from '@/app/_shell/useCalendarReconnect';
import { useSetupDetour } from '@/app/_shell/useSetupDetour';
import { useMentorDashboard, type SetupNext } from '@/lib/api/data/dashboard';
import { deviceTimeZone, inSentence } from '@/lib/utils/format';
import type { Viewer } from '@/types/mentor';
import { ApprovedToast } from './ApprovedToast';
import { DashboardHeader } from './DashboardHeader';
import { KpiGrid } from './KpiGrid';
import { NextSessionCard } from './NextSessionCard';
import { PerformanceSection } from './PerformanceSection';
import { SessionQuality } from './SessionQuality';
import type { StatsQuery } from '@/lib/api/data/mentorStats';
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

const inZone = (iso: string, timeZone: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-US', { ...opts, timeZone }).format(new Date(iso));

// The session-quality card follows the chart's range (Mentor Dashboard v2,
// qualityRange 'synced'): map a range key to how the card fetches mentor-stats — a
// trailing window for 3M/6M/12M, or a whole calendar year for a Year selection
// (contract #469). The card derives its own period labels from the fetched window
// (see SessionQuality), so the labels always match the figures.
const WINDOW_DAYS_BY_RANGE: Record<string, number> = { '3m': 90, '6m': 180, '12m': 365 };
export function chartRangeToStatsQuery(range: string): StatsQuery {
  if (range.startsWith('y')) {
    // `Number('')` is 0 and passes Number.isInteger, so a malformed 'y' (no year)
    // must not become {year: 0} (a 422) — require a real year, else fall through.
    const year = Number(range.slice(1));
    if (Number.isInteger(year) && year > 0) return { year };
  }
  return { windowDays: WINDOW_DAYS_BY_RANGE[range] ?? 180 };
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
  // The chart reports its range here; the session-quality card follows it.
  const [chartRange, setChartRange] = useState('6m');
  const say = (text: string) => setAnnounce((a) => ({ text, id: (a?.id ?? 0) + 1 }));
  // A broken Google grant is costing them bookings right now, so Home says so
  // too rather than leaving it on Integrations, a page they rarely open.
  const reconnect = useCalendarReconnect(member.id, say);
  const dash = useMentorDashboard(member, accountZone, shared);
  // A minute tick, as on the mentee Home: without it `now` is frozen at the
  // last render, so the next-session card never turns to Join on its own.
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const now = useMemo(() => new Date(clock), [clock]);

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

  const statsQuery = chartRangeToStatsQuery(chartRange);
  const upcoming = dash.nextSession.data;
  const nextSession = upcoming
    ? {
        firstName: upcoming.other.firstName,
        dayLabel: inZone(upcoming.startsAt, accountZone, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
      }
    : null;

  const toAction = (next: SetupNext, shareUrl: string): SetupAction =>
    'href' in next.action
      ? { label: next.action.label, href: next.action.href }
      : { label: next.action.label, onClick: () => copyShareLink(shareUrl) };

  return (
    <>
      <DashboardHeader
        name={d.firstName}
        subline={
          d.isNew ? 'Let’s get your first session booked.' : 'Here’s how your mentoring is going.'
        }
        shareUrl={d.shareUrl}
        shareName={d.shareName}
      />
      {reconnect.show && (
        <CalendarReconnectBanner
          busy={reconnect.busy}
          unavailable={reconnect.unavailable}
          failure={reconnect.failure}
          onReconnect={reconnect.reconnect}
        />
      )}
      {d.isNew && d.setup.next ? (
        <SetupBanner
          doneCount={d.setup.doneCount}
          total={d.setup.total}
          pct={d.setup.pct}
          nextTitle={inSentence(d.setup.next.title)}
          action={toAction(d.setup.next, d.shareUrl)}
        />
      ) : (
        <>
          {/* Active mentor: the KPI strip above the next session (design order).
              A new mentor who has finished setup sees only the next-session
              interim (no KPIs — they would all read zero) until the hero ships. */}
          {!d.isNew && dash.metrics && <KpiGrid kpis={dash.metrics} />}
          <NextSessionCard
            isLoading={dash.nextSession.isLoading}
            error={dash.nextSession.error}
            onRetry={dash.nextSession.retry}
            booking={dash.nextSession.data}
            timeZone={accountZone}
            now={now}
          />
          {/* Active mentor: the performance chart beside the session-quality
              panel (Mentor Dashboard v2.dc.html, notNew branch — a wrapping flex
              row that stacks below ~840px). Each keeps its own fetch and four
              states, so a blip in one never holds up the other. min-width:0 on
              the chart column lets the chart shrink rather than scroll the page. */}
          {!d.isNew && (
            <div className={styles.perfRow}>
              <div className={styles.perfChartCol}>
                <PerformanceSection userId={member.id} onRangeChange={setChartRange} />
              </div>
              <div className={styles.perfQualityCol}>
                <SessionQuality
                  userId={member.id}
                  profileHref={d.profileHref}
                  statsQuery={statsQuery}
                  nextSession={nextSession}
                />
              </div>
            </div>
          )}
        </>
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
  const { viewer, member, chrome } = useAppShell();
  const router = useRouter();
  // A mentor who never sent their application has no dashboard yet: mentor
  // onboarding instead (the setup lock), as the nav's Home already goes.
  const detour = useSetupDetour(viewer);

  // Resolved but not a mentor: a guest (or an unusable account) goes to '/'.
  // A mentee member never gets here: the layout redirects them (RoleRedirect).
  const resolved = chrome !== 'pending';
  const isMentor = !!member?.isMentor;
  useEffect(() => {
    if (resolved && !isMentor && !detour) router.replace('/');
  }, [resolved, isMentor, detour, router]);

  return (
    <div className={styles.page}>
      {member?.isMentor && !detour ? <MentorHome member={member} /> : <DashboardLoading />}
      {/* It reads the query: inside its own boundary. */}
      <Suspense>
        <ApprovedToast />
      </Suspense>
    </div>
  );
}
