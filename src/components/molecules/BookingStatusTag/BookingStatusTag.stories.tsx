import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BookingStatusTag } from './BookingStatusTag';
import type { BookingStatus, PickableReason } from '@/types/booking';

const meta: Meta<typeof BookingStatusTag> = {
  title: 'Molecules/BookingStatusTag',
  component: BookingStatusTag,
};
export default meta;
type Story = StoryObj;

export const BookingOutcomes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
      {(
        ['completed', 'cancelled', 'noShow', 'declined', 'expired', 'withdrawn'] as BookingStatus[]
      ).map((s) => (
        <BookingStatusTag key={s} status={s} />
      ))}
    </div>
  ),
};

/**
 * Bookings.dc.html: how long a pending request has left. One pill, both sides —
 * the mentor is told what to do, the mentee who it waits on.
 */
