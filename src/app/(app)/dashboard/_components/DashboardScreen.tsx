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
import { useMentorStatus } from '@/lib/api/data/mentorStatus';
import { DASHBOARD_SUBLINE, HERO_COPY } from '@/lib/copy/dashboard';
import { deviceTimeZone, inSentence } from '@/lib/utils/format';
import type { Viewer } from '@/types/mentor';
import { ApprovedToast } from './ApprovedToast';
import { DashboardHeader } from './DashboardHeader';
import { KpiGrid } from './KpiGrid';
import { NewMentorHero } from './NewMentorHero';
import { NextSessionCard } from './NextSessionCard';
import { NotLiveNotice } from './NotLiveNotice';
import { PerformanceSection } from './PerformanceSection';
import { SessionQuality } from './SessionQuality';
import type { StatsQuery } from '@/lib/api/data/mentorStats';
import { SetupBanner, type SetupAction } from './SetupBanner';
import { useWeekMoves } from './useWeekMoves';
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

/** Where the hero goes, while the upcoming sessions that pick its stage load. */
function HeroLoading() {
  return (
    <div className={styles.loading} role="status" aria-busy>
      <span className="sr-only">Loading your bookings</span>
      <Skeleton height="168px" radius="xl" />
    </div>
  );
}

/**
 * The upcoming sessions failed, so whether this mentor is booked isn't known.
 * Say so where the hero goes rather than guess "Get your first booking".
 */
function HeroError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles.pageState} role="alert">
      <p className={styles.stateText}>{HERO_COPY.bookingsError}</p>
      <Button variant="secondary-outlined" onClick={onRetry}>
        {HERO_COPY.retry}
      </Button>
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
  // Paused or unlisted, for a not-ready mentor with nothing left to set up
  // (the reconnect banner reads the same query, so no second request).
  const status = useMentorStatus(member.id);
  // A minute tick, as on the mentee Home: without it `now` is frozen at the
  // last render, so the next-session card never turns to Join on its own.
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const now = useMemo(() => new Date(clock), [clock]);
  const weekMoves = useWeekMoves(member.id, accountZone, now);

  // A copy from anywhere (the share menu, the setup banner, the Share move)
  // counts for both the setup step and this week's Share move (design shared()).
  const markShared = () => {
    setShared(true);
    persistShared(member.id);
    weekMoves.mark('share');
  };

  const copyShareLink = (url: string) => {
    if (!url || !navigator.clipboard) {
      say('Couldn’t copy the link');
      return;
    }
    navigator.clipboard.writeText(url).then(
      () => {
        markShared();
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

  const stage = dash.stage;
  // Not bookable with nothing left to set up: never "let's get booked" above a
  // notice that says they can't be (GitHub review, PR 410).
  const subline =
    stage === 'active'
      ? DASHBOARD_SUBLINE.active
      : stage === 'firstBooked'
        ? DASHBOARD_SUBLINE.firstBooked
        : stage === 'notReady' && !d.setup.next
          ? DASHBOARD_SUBLINE.notLive
          : DASHBOARD_SUBLINE.new;

  return (
    <>
      <DashboardHeader
        name={d.firstName}
        subline={subline}
        shareUrl={d.shareUrl}
        shareName={d.shareName}
        onShareCopied={markShared}
      />
      {reconnect.show && (
        <CalendarReconnectBanner
          busy={reconnect.busy}
          unavailable={reconnect.unavailable}
          failure={reconnect.failure}
          onReconnect={reconnect.reconnect}
        />
      )}
      {/* A new mentor with steps left sees the banner, above the hero when
          they're bookable (PRD Mentor Home). */}
      {d.isNew && d.setup.next && (
        <SetupBanner
          doneCount={d.setup.doneCount}
          total={d.setup.total}
          pct={d.setup.pct}
          nextTitle={inSentence(d.setup.next.title)}
          action={toAction(d.setup.next, d.shareUrl)}
        />
      )}
      {stage === 'firstBooked' || stage === 'noBookings' ? (
        <NewMentorHero
          stage={stage}
          mentorId={member.id}
          timeZone={accountZone}
          profileHref={d.profileHref}
          approvedAt={d.approvedAt}
          nextSession={dash.nextSession}
          upcomingCount={dash.upcomingCount}
          now={now}
          movesDone={weekMoves.done}
          onMove={weekMoves.mark}
          onCopyLink={() => copyShareLink(d.shareUrl)}
        />
      ) : stage === null ? (
        // Bookable, and the upcoming sessions that pick the hero aren't in yet.
        dash.nextSession.error ? (
          <HeroError onRetry={dash.nextSession.retry} />
        ) : (
          <HeroLoading />
        )
      ) : stage === 'active' ? (
        <>
          {/* The KPI strip above the next session (design order). */}
          {dash.metrics && <KpiGrid kpis={dash.metrics} />}
          <NextSessionCard
            isLoading={dash.nextSession.isLoading}
            error={dash.nextSession.error}
            onRetry={dash.nextSession.retry}
            booking={dash.nextSession.data}
            timeZone={accountZone}
            now={now}
          />
          {/* The performance chart beside the session-quality panel
              (Mentor Dashboard v2.dc.html, notNew branch — a wrapping flex
              row that stacks below ~840px). Each keeps its own fetch and four
              states, so a blip in one never holds up the other. min-width:0 on
              the chart column lets the chart shrink rather than scroll the page. */}
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
        </>
      ) : d.setup.next ? null /* notReady: the header and the setup banner only. */ : (
        <NotLiveNotice status={status.data} firstName={member.firstName} />
      )}
      <LiveRegion message={announce} />
    </>
  );
}

/**
 * Mentor Dashboard (home), the route every mentor lands on (homeFor →
 * /dashboard). Only mentors belong here; anyone else is bounced to '/', which
 * routes them to their own home. The view follows the mentor's stage
 * (mentorStage): the active dashboard, the new-mentor hero, or, for a mentor
 * who isn't bookable yet, the header and setup banner alone.
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
