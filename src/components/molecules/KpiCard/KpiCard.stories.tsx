import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { KpiCard } from './KpiCard';

const meta: Meta<typeof KpiCard> = { title: 'Molecules/KpiCard', component: KpiCard };
export default meta;
type Story = StoryObj;

export const KpiCards: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 16,
        maxWidth: 760,
      }}
    >
      <KpiCard
        label="Sessions held"
        value="12"
        trend={{ text: '2 in the last 30 days', icon: 'trending_up', tone: 'positive' }}
      />
      <KpiCard label="Mentors met" value="8" link={{ label: 'View mentors', onClick: fn() }} />
      <KpiCard
        label="Hours of guidance"
        value="9"
        unit="hrs"
        trend={{ text: '1.5 hrs in the last 30 days', icon: 'trending_up', tone: 'positive' }}
      />
      <KpiCard
        label="Missed sessions"
        value="0"
        trend={{ text: 'None in the last 90 days', icon: 'check_circle', tone: 'positive' }}
      />
      <KpiCard label="Hours of guidance" value={null} />
      <KpiCard
        label="Missed · 90 days"
        value="1"
        valueTone="warning"
        link={{ label: 'View missed', href: '/bookings?tab=history&filter=missed' }}
      />
      <KpiCard
        label="Missed · 90 days"
        value="2"
        valueTone="danger"
        link={{ label: 'View missed', href: '/bookings?tab=history&filter=missed' }}
      />
    </div>
  ),
};

/** Admin.dc.html summary cards: each one is a button that opens its tab. */
export const SummaryButtons: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 16,
        maxWidth: 760,
      }}
    >
      <KpiCard
        size="lg"
        label="Applications waiting"
        value="4"
        valueTone="danger"
        trend={{ text: 'Longest wait 7 days', tone: 'neutral' }}
        onClick={fn()}
        ariaLabel="Applications waiting: 4. Open Applications"
      />
      <KpiCard
        size="lg"
        label="Approved mentors"
        value="6"
        trend={{ text: 'Average show-up 84%', tone: 'neutral' }}
        onClick={fn()}
        ariaLabel="Approved mentors: 6. Open Approved"
      />
      <KpiCard
        size="lg"
        label="At risk"
        value="0"
        trend={{ text: 'Show-up rate under 50%', tone: 'neutral' }}
        onClick={fn()}
        ariaLabel="At risk: 0. Open Approved"
      />
    </div>
  ),
};
