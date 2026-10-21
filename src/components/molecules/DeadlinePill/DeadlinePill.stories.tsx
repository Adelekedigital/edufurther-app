import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { DeadlinePill } from './DeadlinePill';

const meta: Meta<typeof DeadlinePill> = {
  title: 'Molecules/DeadlinePill',
  component: DeadlinePill,
};
export default meta;
type Story = StoryObj;

export const PendingDeadline: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {/* The mentor's side: theirs to answer. */}
      <DeadlinePill icon="timer" urgent>
        Respond within 30 min
      </DeadlinePill>
      <DeadlinePill icon="timer" urgent>
        Respond within 5h
      </DeadlinePill>
      <DeadlinePill icon="timer">Respond within 3 days</DeadlinePill>
      {/* The mentee's side: nothing to do but wait — until it is nearly too late. */}
      <DeadlinePill icon="hourglass_top">Waiting for Amara to confirm</DeadlinePill>
      <DeadlinePill icon="timer" urgent>
        Amara has 18h left to confirm
      </DeadlinePill>
    </div>
  ),
};

/** Bookings.dc.html: the day block at the head of a booking row. */
