import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { Booking, BookingParty } from '@/types/booking';
import { Button } from '@/components/atoms/Button/Button';
import { BookingList } from '../BookingList/BookingList';
import { BookingRow } from './BookingRow';

const NOW = new Date('2026-10-03T12:00:00Z');
const at = (h: number) => new Date(NOW.getTime() + h * 3_600_000).toISOString();

export const party = (name = 'Amara Okafor', over: Partial<BookingParty> = {}): BookingParty => ({
  id: 'p1',
  name,
  firstName: name.split(' ')[0]!,
  initials: name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2),
  avatarUrl: null,
  avatarFocus: null,
  deleted: false,
  timeZone: 'Africa/Lagos',
  cover: 'sand',
  joinedAt: null,
  ...over,
});

export const sampleBooking = (over: Partial<Booking> = {}): Booking => ({
  id: 'b1',
  status: 'confirmed',
  side: 'mentor',
  other: party(),
  startsAt: at(26),
  endsAt: at(27),
  durationMin: 60,
  title: 'School shortlist',
  note: 'I have nine programs and need to cut it to five. Funding matters most.',
  answersPreview: null,
  createdAt: at(-240),
  respondBy: null,
  joinOpensAt: null,
  joinClosesAt: null,
  menteeAttendanceRate: 92,
  ...over,
});

/** Bookings.dc.html `layout=agendaV2`: one booking in a list. */
const meta: Meta<typeof BookingRow> = {
  title: 'Organisms/Booking row',
  component: BookingRow,
  args: { booking: sampleBooking(), timeZone: 'Africa/Lagos', now: NOW },
  decorators: [
    (Story) => (
      <BookingList label="Bookings">
        <Story />
      </BookingList>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof BookingRow>;

export const Upcoming: Story = {};

/**
 * A list of exactly one. Both `:first-child` and `:last-child` match it, so all
 * four corners must round — a shorthand here once left the top two square
 * inside a rounded box (failure log #40).
 */
export const OnlyRow: Story = {};

/** Three rows: the corners belong to the first and last, dividers between. */
export const InAList: Story = {
  render: (args) => (
    <>
      <BookingRow {...args} booking={sampleBooking({ id: 'a' })} />
      <BookingRow {...args} booking={sampleBooking({ id: 'b', title: 'Visa practice' })} />
      <BookingRow {...args} booking={sampleBooking({ id: 'c', title: 'Quick CV check' })} />
    </>
  ),
};

/** The mentor's side of a request: a countdown, because it is theirs to answer. */
export const PendingForMentor: Story = {
  args: { booking: sampleBooking({ status: 'pending', respondBy: at(5) }) },
};

/** The same request from the mentee's side: who it waits on, and no countdown. */
export const PendingForMentee: Story = {
  args: { booking: sampleBooking({ status: 'pending', side: 'mentee', respondBy: at(5) }) },
};

/** Nobody answered in time. It stays in Pending, labelled, with nothing to do. */
export const Lapsed: Story = {
  args: { booking: sampleBooking({ status: 'pending', respondBy: at(-2) }) },
};

/** Past rows carry the full date: a day badge alone loses the year. */
export const Completed: Story = {
  args: {
    booking: sampleBooking({ status: 'completed', startsAt: at(-24 * 90), endsAt: at(-24 * 90 + 1) }),
    actions: (
      <Button variant="secondary-outlined" size="small">
        Book again
      </Button>
    ),
  },
};

export const Missed: Story = { args: { booking: sampleBooking({ status: 'noShow' }) } };

/** An hour nobody wants: the line says so, with the bedtime icon. */
export const OddHourForThem: Story = {
  args: {
    booking: sampleBooking({
      startsAt: '2026-10-04T21:00:00Z',
      endsAt: '2026-10-04T22:00:00Z',
      other: party('Wanjiru Kamau', { timeZone: 'Pacific/Auckland' }),
    }),
    timeZone: 'Africa/Lagos',
  },
};

/** Same zone on both sides: no second time line, which would only repeat the row. */
export const SameZone: Story = {
  args: { booking: sampleBooking({ other: party('Amara Okafor', { timeZone: 'Africa/Lagos' }) }) },
};

/** Undesigned outcomes — our provisional copy (bookings-design-request.md). */
export const Declined: Story = { args: { booking: sampleBooking({ status: 'declined' }) } };
export const Withdrawn: Story = { args: { booking: sampleBooking({ status: 'withdrawn' }) } };

/** No topic on the session: the heading drops to the person alone. */
export const NoTopic: Story = { args: { booking: sampleBooking({ title: null }) } };

export const LongNames: Story = {
  args: {
    booking: sampleBooking({
      title: 'Scholarship and funding strategy for competitive postgraduate programs',
      other: party('Oluwadamilare Adebayo-Ogunleye Chukwuemeka'),
    }),
  },
};

/** A deleted account keeps its session — the session still happened. */
export const DeletedParty: Story = {
  args: {
    booking: sampleBooking({
      status: 'completed',
      other: party('Deleted user', { deleted: true, initials: '' }),
    }),
  },
};

export const Phone: Story = {
  globals: { viewport: { value: 'mobile2', isRotated: false } },
  args: {
    actions: (
      <Button variant="secondary-outlined" size="small">
        Book again
      </Button>
    ),
  },
};
