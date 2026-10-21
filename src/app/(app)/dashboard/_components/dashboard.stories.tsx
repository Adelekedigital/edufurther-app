import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { Booking } from '@/types/booking';
import type { Kpi } from '@/lib/api/data/dashboard';
import { DashboardHeader } from './DashboardHeader';
import { KpiGrid } from './KpiGrid';
import { NextSessionCard } from './NextSessionCard';
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
