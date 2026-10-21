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
    </div>
  ),
};
