import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BookingDayBadge } from './BookingDayBadge';

const meta: Meta<typeof BookingDayBadge> = {
  title: 'Molecules/BookingDayBadge',
  component: BookingDayBadge,
};
export default meta;
type Story = StoryObj;

export const BookingDay: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
      <BookingDayBadge startsAt="2026-10-04T16:00:00Z" timeZone="Africa/Lagos" />
      <BookingDayBadge startsAt="2026-12-25T09:00:00Z" timeZone="Africa/Lagos" />
      {/* The same instant, two zones, two days. */}
      <BookingDayBadge startsAt="2026-10-04T23:30:00Z" timeZone="Pacific/Auckland" />
    </div>
  ),
};

/**
 * Bookings.dc.html details panel: what the mentee answered on the booking form.
 * Every kind of answer, plus the two the design has no state for — a question
 * the mentor has since dropped, and a file retention has removed.
 */
