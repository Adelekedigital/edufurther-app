import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { Booking } from '@/types/booking';
import type { Kpi } from '@/lib/api/data/dashboard';
import { keys } from '@/lib/api/data/keys';
import type { StatBlock, WindowStats } from '@/lib/api/data/mentorStats';
import type { ReviewQuote } from '@/lib/api/data/myReviews';
import { DashboardHeader } from './DashboardHeader';
import { KpiGrid } from './KpiGrid';
import { NextSessionCard } from './NextSessionCard';
import { SessionQuality } from './SessionQuality';
import { SetupBanner } from './SetupBanner';

/** The Mentor Dashboard sections, each rendered in isolation across its states. */
const meta: Meta = { title: 'Screens/Mentor Dashboard' };
export default meta;
type Story = StoryObj;

const col = { display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1080 } as const;

export const Header: Story = {
  render: () => (
    <div style={col}>
      <DashboardHeader
        name="Gbenga"
        subline="Let’s get your first session booked."
        shareUrl="https://edufurther.com/mentors/gbenga"
        shareName="Gbenga Adeyemi"
      />
      <DashboardHeader
        name="Gbenga"
        subline="Here’s how your mentoring is going."
        shareUrl="https://edufurther.com/mentors/gbenga"
        shareName="Gbenga Adeyemi"
      />
    </div>
  ),
};

export const Setup: Story = {
  render: () => (
    <div style={col}>
      <SetupBanner
        doneCount={0}
        total={4}
        pct={0}
        nextTitle="complete your profile"
        action={{ label: 'Edit profile', href: '/mentors/x' }}
      />
      <SetupBanner
        doneCount={2}
        total={4}
        pct={50}
        nextTitle="connect google calendar"
        action={{ label: 'Connect', href: '/integrations' }}
      />
      <SetupBanner
        doneCount={3}
        total={4}
        pct={75}
        nextTitle="share your profile"
        action={{ label: 'Copy link', onClick: () => {} }}
      />
    </div>
  ),
};

const start = Date.now() + 8 * 864e5;
const sample = {
  id: 's1',
  status: 'confirmed',
  side: 'mentor',
  other: { name: 'Taofeeq Animasahun' },
  title: 'Statement of Purpose Review',
  startsAt: new Date(start).toISOString(),
  endsAt: new Date(start + 36e5).toISOString(),
  durationMin: 60,
  joinOpensAt: new Date(start - 6e5).toISOString(),
  joinClosesAt: new Date(start + 36e5).toISOString(),
  doorClosesAt: null,
  myJoinedAt: null,
} as unknown as Booking;

export const NextSession: Story = {
  render: () => (
    <div style={col}>
      <NextSessionCard
        isLoading={false}
        error={null}
        onRetry={() => {}}
        booking={sample}
        timeZone="Africa/Lagos"
        now={new Date()}
      />
      <NextSessionCard
        isLoading={false}
        error={null}
        onRetry={() => {}}
        booking={null}
        timeZone="Africa/Lagos"
        now={new Date()}
      />
      <NextSessionCard
        isLoading
        error={null}
        onRetry={() => {}}
        booking={null}
        timeZone="Africa/Lagos"
        now={new Date()}
      />
    </div>
  ),
};

const activeKpis: Kpi[] = [
  { key: 'sessions', label: 'Sessions completed', value: '2', info: 'Sessions marked complete since you joined' },
  { key: 'time', label: 'Mentoring time', value: '120', unit: 'min', info: '≈ 2 hours in total, shown in minutes for precision' },
  { key: 'mentees', label: 'Mentees mentored', value: '1', info: 'Unique mentees with a completed session' },
  { key: 'rating', label: 'Average rating', value: '4.8', unit: '/ 5', info: 'Average of mentee reviews after completed sessions' },
];
const freshKpis: Kpi[] = activeKpis.map((k) => ({ ...k, value: k.key === 'rating' ? null : '0' }));

export const Kpis: Story = {
  render: () => (
    <div style={col}>
      <KpiGrid kpis={activeKpis} />
      <KpiGrid kpis={freshKpis} />
    </div>
  ),
};

// ---- Session quality: the three tiers ----------------------------------------
// The card fetches its own figures, so each story seeds a fresh query cache
// (never stale, never refetched) with the window it would have read.

const qualityBlock = (over: Partial<StatBlock>): StatBlock => ({
  since: '2026-07-27T00:00:00Z',
  until: '2026-10-25T00:00:00Z',
  completedSessions: 16,
  mentoringMinutes: 960,
  menteesMentored: 9,
  attendanceRate: 94,
  missedByMentor: 0,
  menteesLeftWaiting: 0,
  missedByMentee: 0,
  cancelledByMentor: 1,
  reviewCount: 12,
  averageRating: 4.8,
  ...over,
});

const qualityQuote: ReviewQuote = {
  quote: 'Clear, practical feedback on my SOP. I left knowing exactly what to fix.',
  by: 'Pulane L. · Statement of Purpose Review',
};

function SeededQuality({ current, children }: { current: Partial<StatBlock>; children: ReactNode }) {
  const [client] = useState(() => {
    const qc = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false, refetchOnMount: false } },
    });
    const stats: WindowStats = {
      windowDays: 90,
      year: null,
      currentStreak: 6,
      current: qualityBlock(current),
      previous: qualityBlock({ attendanceRate: 70 }),
    };
    qc.setQueryData(keys.mentorStats.window('u1', 90), stats);
    qc.setQueryData(keys.myReviews.quote('u1'), qualityQuote);
    return qc;
  });
  return (
    <QueryClientProvider client={client}>
      <div style={{ maxWidth: 420 }}>{children}</div>
    </QueryClientProvider>
  );
}

const qualityStory = (current: Partial<StatBlock>): Story => ({
  render: () => (
    <SeededQuality current={current}>
      <SessionQuality userId="u1" profileHref="/mentors/gbenga" />
    </SeededQuality>
  ),
});

/** 80 and up: "On track", green ring, the streak teaser. */
export const QualityOnTrack = qualityStory({ attendanceRate: 94 });
/** 50 to 79: "Needs attention", amber ring, badge and card border. */
export const QualityNeedsAttention = qualityStory({
  attendanceRate: 67,
  completedSessions: 8,
  missedByMentor: 3,
  menteesLeftWaiting: 3,
});
/** Below 50: "At risk", red ring, badge and card border. */
export const QualityAtRisk = qualityStory({
  attendanceRate: 33,
  completedSessions: 2,
  missedByMentor: 4,
  menteesLeftWaiting: 4,
  cancelledByMentor: 0,
  averageRating: 3.6,
  reviewCount: 3,
});
