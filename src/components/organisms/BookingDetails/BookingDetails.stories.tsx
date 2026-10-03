import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { sampleBookingFor, sampleParty } from '@/lib/utils/bookingTestFixtures';
import { BookingDetails } from './BookingDetails';

const NOW = new Date('2026-10-03T12:00:00Z');
const at = (h: number) => new Date(NOW.getTime() + h * 3_600_000).toISOString();
const past = (h: number) => ({ startsAt: at(-h), endsAt: at(-h + 1) });

/**
 * The details panel's contents (Bookings.dc.html). Framed by the aside on
 * desktop and the sheet on phones; both say exactly this.
 */
const meta: Meta<typeof BookingDetails> = {
  title: 'Organisms/Booking details',
  component: BookingDetails,
  args: {
    booking: sampleBookingFor({
      startsAt: at(26),
      endsAt: at(27),
      note: 'I have nine programs and need to cut it to five. Funding matters most, and I want to talk about which deadlines are realistic.',
      menteeAttendanceRate: 92,
    }),
    timeZone: 'America/New_York',
    titleId: 'details-title',
    onClose: fn(),
    now: NOW,
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: 380,
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--ink-200)',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--white)',
          overflow: 'hidden',
        }}
      >
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof BookingDetails>;

export const Upcoming: Story = {};

/** The next session, inside its join window: the footer's one action. */
export const Joinable: Story = {
  args: {
    booking: sampleBookingFor({
      startsAt: at(-0.05),
      endsAt: at(1),
      joinOpensAt: at(-0.2),
      joinClosesAt: at(0.3),
      note: 'Ready when you are.',
    }),
    onJoin: fn(),
  },
};

export const BeforeTheJoinWindow: Story = {
  args: {
    booking: sampleBookingFor({
      startsAt: at(0.5),
      endsAt: at(1.5),
      joinOpensAt: at(0.4),
      joinClosesAt: at(0.75),
    }),
    onJoin: fn(),
  },
};

/** A request the viewer must answer: the deadline is the status. */
export const PendingForMentor: Story = {
  args: { booking: sampleBookingFor({ status: 'pending', respondBy: at(5) }) },
};

/** The same request from the other side: waiting, not acting. */
export const PendingForMentee: Story = {
  args: { booking: sampleBookingFor({ status: 'pending', side: 'mentee', respondBy: at(5) }) },
};

export const Lapsed: Story = {
  args: { booking: sampleBookingFor({ status: 'pending', respondBy: at(-3) }) },
};

export const Completed: Story = {
  args: { booking: sampleBookingFor({ status: 'completed', ...past(300) }) },
};

/**
 * The reason block — ours. The design has none, because the API had nowhere to
 * keep a reason when it was drawn; `/sessions/{id}/events` is the only place it
 * lives, and it is what a past booking gets opened for.
 */
export const CancelledWithAReason: Story = {
  args: {
    booking: sampleBookingFor({ status: 'cancelled', ...past(300) }),
    outcome: {
      status: 'cancelled',
      reason: 'Sorry — my visa interview was moved to the same hour.',
      by: 'them',
      at: at(-320),
    },
  },
};

/** Cancelled, but nobody wrote anything: the heading alone, no empty quote. */
export const CancelledWithoutAReason: Story = {
  args: {
    booking: sampleBookingFor({ status: 'cancelled', ...past(300) }),
    outcome: { status: 'cancelled', reason: null, by: 'them', at: at(-320) },
  },
};

export const DeclinedByThem: Story = {
  args: {
    booking: sampleBookingFor({ status: 'declined', ...past(600) }),
    outcome: {
      status: 'declined',
      reason: 'I’m away that week. Try the 14th and I’ll confirm.',
      by: 'them',
      at: at(-620),
    },
  },
};

export const WithdrawnByYou: Story = {
  args: {
    booking: sampleBookingFor({ status: 'withdrawn', side: 'mentee', ...past(900) }),
    outcome: { status: 'withdrawn', reason: null, by: 'you', at: at(-920) },
  },
};

/** Nobody did it: an expiry sweep. */
export const Expired: Story = {
  args: {
    booking: sampleBookingFor({ status: 'expired', ...past(1200) }),
    outcome: { status: 'expired', reason: null, by: 'system', at: at(-1210) },
  },
};

export const Missed: Story = {
  args: {
    booking: sampleBookingFor({ status: 'noShow', ...past(1500) }),
    outcome: { status: 'noShow', reason: null, by: 'system', at: at(-1510) },
  },
};

/** No topic, no note, no attendance figure: the blocks are absent, not empty. */
export const Sparse: Story = {
  args: {
    booking: sampleBookingFor({ title: null, note: null, menteeAttendanceRate: null }),
  },
};

/** Both parties in one zone: no second time line, which would only repeat. */
export const SameZone: Story = { args: { timeZone: 'Africa/Lagos' } };

export const DeletedParty: Story = {
  args: {
    booking: sampleBookingFor({
      status: 'completed',
      ...past(300),
      other: sampleParty({
        name: 'Deleted user',
        firstName: 'Deleted user',
        initials: '',
        deleted: true,
        timeZone: null,
      }),
    }),
  },
};

export const LongEverything: Story = {
  args: {
    booking: sampleBookingFor({
      title: 'Scholarship and funding strategy for competitive postgraduate programs',
      other: sampleParty({
        name: 'Oluwadamilare Adebayo-Ogunleye Chukwuemeka',
        firstName: 'Oluwadamilare',
      }),
      note: 'I recently started my postgraduate scholarship application. I have attended several webinars, gathered useful information, and need help reviewing my essays before the December deadline. I also want to talk about recommendation letters, and whether my shortlist is realistic given my funding situation.',
    }),
  },
};
