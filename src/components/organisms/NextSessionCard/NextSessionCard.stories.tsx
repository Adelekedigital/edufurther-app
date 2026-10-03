import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { BookingList } from '../BookingList/BookingList';
import { BookingRow } from '../BookingRow/BookingRow';
import { sampleBooking } from '../BookingRow/BookingRow.stories';
import { NextSessionCard } from './NextSessionCard';

const NOW = new Date('2026-10-03T12:00:00Z');
const at = (h: number) => new Date(NOW.getTime() + h * 3_600_000).toISOString();

/** Bookings.dc.html hero (`heroTone=blue`): the next session, above the list. */
const meta: Meta<typeof NextSessionCard> = {
  title: 'Organisms/Next session card',
  component: NextSessionCard,
  args: {
    booking: sampleBooking({ title: 'Statement of Purpose review' }),
    timeZone: 'Africa/Lagos',
    onJoin: fn(),
    now: NOW,
  },
};
export default meta;
type Story = StoryObj<typeof NextSessionCard>;

/** Days away: no Join yet, and no explanation needed either. */
export const DaysAway: Story = {};

/** Within the hour, before the door opens: Join waits, and says why. */
export const BeforeTheWindow: Story = {
  args: {
    booking: sampleBooking({
      title: 'Statement of Purpose review',
      startsAt: at(0.5),
      endsAt: at(1.5),
      joinOpensAt: at(0.5 - 5 / 60),
      joinClosesAt: at(0.75),
    }),
  },
};

export const Joinable: Story = {
  args: {
    booking: sampleBooking({
      title: 'Statement of Purpose review',
      startsAt: at(0.05),
      endsAt: at(1),
      joinOpensAt: at(-0.1),
      joinClosesAt: at(0.3),
    }),
  },
};

/** Already running — the one state where the person should be elsewhere. */
export const InProgress: Story = {
  args: {
    booking: sampleBooking({
      title: 'Statement of Purpose review',
      startsAt: at(-0.1),
      endsAt: at(0.9),
      joinOpensAt: at(-0.2),
      joinClosesAt: at(0.15),
    }),
  },
};

export const Joining: Story = { args: { ...Joinable.args, joining: true } };

/** No booking message: the cover box is absent rather than empty. */
export const NoNote: Story = {
  args: { booking: sampleBooking({ title: 'Statement of Purpose review', note: null }) },
};

/** The mentee's side — the note is their own, so the label changes. */
export const MenteeSide: Story = {
  args: { booking: sampleBooking({ title: 'Visa interview practice', side: 'mentee' }) },
};

export const LongEverything: Story = {
  args: {
    booking: sampleBooking({
      title: 'Scholarship and funding strategy for competitive postgraduate programs',
      note: 'I recently started my postgraduate scholarship application. I have attended several webinars, gathered useful information, and need help reviewing my essays before the December deadline. I also want to talk about recommendation letters.',
    }),
  },
};

export const Phone: Story = { globals: { viewport: { value: 'mobile2', isRotated: false } } };

/** How it sits above the list it leads. */
export const WithTheListBelow: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <NextSessionCard {...args} />
      <BookingList
        label="Later"
        heading="Later"
        more={{ label: 'Show 5 more', caption: 'Showing 2 of 7', onClick: fn() }}
      >
        <BookingRow
          booking={sampleBooking({ id: 'a', title: 'Visa interview practice' })}
          timeZone="Africa/Lagos"
          now={NOW}
        />
        <BookingRow
          booking={sampleBooking({ id: 'b', title: 'Quick CV check' })}
          timeZone="Africa/Lagos"
          now={NOW}
        />
      </BookingList>
    </div>
  ),
};
