import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { sampleBookingFor, sampleParty } from '@/lib/utils/bookingTestFixtures';
import { outcomeView } from '@/lib/utils/sessionOutcome';
import type { Booking, BookingParty } from '@/types/booking';
import { SessionOutcome } from './SessionOutcome';

const gbenga = (attendance: BookingParty['attendance']) =>
  sampleParty({ id: 'gbenga', firstName: 'Gbenga', name: 'Gbenga Ogundipe', attendance });
const completed = (side: Booking['side']) =>
  sampleBookingFor({
    status: 'completed',
    side,
    myAttendance: 'attended',
    other: gbenga('attended'),
  });
const missed = (
  side: Booking['side'],
  mine: BookingParty['attendance'],
  theirs: BookingParty['attendance'],
) => sampleBookingFor({ status: 'noShow', side, myAttendance: mine, other: gbenga(theirs) });
const of = (b: Booking, over: Partial<Parameters<typeof outcomeView>[0]> = {}) =>
  outcomeView({ booking: b, canBook: true, reviewable: true, reviewed: false, ...over });

/** Session Join.dc.html `isCompleted` and `isMissed`, every case the page can reach. */
const meta: Meta<typeof SessionOutcome> = {
  title: 'Organisms/Session outcome',
  component: SessionOutcome,
  args: { onAction: fn() },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 680, border: '1px solid var(--ink-200)', borderRadius: 10 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof SessionOutcome>;

export const CompletedAskReview: Story = { args: { view: of(completed('mentee')) } };
export const CompletedReviewUnknown: Story = {
  args: { view: of(completed('mentee'), { reviewable: null }) },
};
export const CompletedThanks: Story = {
  args: { view: of(completed('mentee'), { reviewed: true }) },
};
export const CompletedAlreadyReviewed: Story = {
  args: { view: of(completed('mentee'), { reviewable: false }) },
};
export const CompletedMentor: Story = { args: { view: of(completed('mentor')) } };

export const MissedByMentorMenteeView: Story = {
  args: { view: of(missed('mentee', 'attended', 'noShow')) },
};
export const MissedByMenteeMenteeView: Story = {
  args: { view: of(missed('mentee', 'noShow', 'attended')) },
};
export const MissedByMentorMentorView: Story = {
  args: { view: of(missed('mentor', 'noShow', 'attended')) },
};
export const MissedByMenteeMentorView: Story = {
  args: { view: of(missed('mentor', 'attended', 'noShow')) },
};
export const NeitherJoined: Story = { args: { view: of(missed('mentee', 'noShow', 'noShow')) } };
export const NoRecord: Story = { args: { view: of(missed('mentee', 'pending', 'pending')) } };
