import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { sampleBookingFor, sampleParty } from '@/lib/utils/bookingTestFixtures';
import type { Booking } from '@/types/booking';
import { BookingStatusTag } from './BookingStatusTag';

const meta: Meta<typeof BookingStatusTag> = {
  title: 'Molecules/BookingStatusTag',
  component: BookingStatusTag,
};
export default meta;
type Story = StoryObj;

/** Every History tag, from the mentor's side (owner decision B7: tags name who). */
const OUTCOMES: Partial<Booking>[] = [
  { status: 'completed' },
  { status: 'cancelled', cancelledBy: 'mentor' },
  { status: 'cancelled', cancelledBy: 'mentee' },
  { status: 'cancelled', cancelledBy: null },
  { status: 'noShow', myAttendance: 'noShow', other: sampleParty({ attendance: 'attended' }) },
  { status: 'noShow', myAttendance: 'attended', other: sampleParty({ attendance: 'noShow' }) },
  { status: 'noShow', myAttendance: 'pending', other: sampleParty({ attendance: 'pending' }) },
  { status: 'declined' },
  { status: 'expired' },
  { status: 'withdrawn' },
];

export const BookingOutcomes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
      {OUTCOMES.map((o, i) => (
        <BookingStatusTag key={i} booking={sampleBookingFor(o)} />
      ))}
    </div>
  ),
};
