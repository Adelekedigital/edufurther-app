import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatusLinkRow } from './StatusLinkRow';

const meta: Meta<typeof StatusLinkRow> = {
  title: 'Molecules/StatusLinkRow',
  component: StatusLinkRow,
};
export default meta;
type Story = StoryObj;

const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
  gap: 12,
  maxWidth: 1032,
} as const;

/** Content, loading (skeleton value) and a failed row, side by side. */
export const States: Story = {
  render: () => (
    <div style={grid}>
      <StatusLinkRow
        icon="travel_explore"
        label="Listed on Explore"
        value="Since Oct 18"
        href="#"
      />
      <StatusLinkRow
        icon="event_available"
        label="Available times, next 14 days"
        value={null}
        href="#"
      />
      <StatusLinkRow icon="inbox" label="Booking requests" value="Couldn’t load" href="#" />
    </div>
  ),
};

export const LongLabel: Story = {
  render: () => (
    <div style={{ maxWidth: 220 }}>
      <StatusLinkRow
        icon="event_available"
        label="Open times across every session type, next 14 days"
        value="128"
        href="#"
      />
    </div>
  ),
};
