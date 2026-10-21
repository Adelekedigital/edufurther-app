import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatTile } from './StatTile';

const meta: Meta<typeof StatTile> = { title: 'Molecules/StatTile', component: StatTile };
export default meta;
type Story = StoryObj;

export const StatTiles: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', maxWidth: 400 }}>
      <StatTile icon="schedule" tone="gold" value="3,060 mins" label="mentoring time" />
      <StatTile icon="event_available" tone="blue" value="51" label="sessions completed" />
      <StatTile icon="groups" tone="green" value="27" label="mentees mentored" />
      <StatTile icon="verified_user" tone="neutral" value="88%" label="avg. attendance" />
    </div>
  ),
};
