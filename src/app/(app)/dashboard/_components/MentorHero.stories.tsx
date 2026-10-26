import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatusLinkRow } from '@/components/molecules/StatusLinkRow/StatusLinkRow';
import { HERO_COPY, STATUS_COPY } from '@/lib/copy/dashboard';
import type { Booking } from '@/types/booking';
import { HeroRows, MentorHero } from './MentorHero';
import { NextSessionCard } from './NextSessionCard';
import { WeekMoves } from './WeekMoves';

/** The new-mentor hero (Mentor Dashboard v2, isNew), in both stages and its row states. */
const meta: Meta = { title: 'Screens/Mentor Dashboard/New mentor hero' };
export default meta;
type Story = StoryObj;

const col = { maxWidth: 1080 } as const;
const noop = () => {};
const allMoves = ['share', 'about', 'hours'] as const;
const start = Date.now() + 6 * 864e5;
const first = {
  id: 's1',
  status: 'confirmed',
  side: 'mentor',
  other: { name: 'Ada Okafor' },
  title: 'Intro chat',
  startsAt: new Date(start).toISOString(),
  endsAt: new Date(start + 18e5).toISOString(),
  durationMin: 30,
  joinOpensAt: new Date(start - 6e5).toISOString(),
  joinClosesAt: new Date(start + 18e5).toISOString(),
  doorClosesAt: null,
  myJoinedAt: null,
} as unknown as Booking;

export const NoBookings: Story = {
  render: () => (
    <div style={col}>
      <MentorHero {...HERO_COPY.noBookings}>
        <HeroRows>
          <StatusLinkRow
            icon="travel_explore"
            label={STATUS_COPY.listed}
            value="Since Oct 18"
            href="#"
          />
          <StatusLinkRow icon="event_available" label={STATUS_COPY.openTimes} value="6" href="#" />
          <StatusLinkRow
            icon="inbox"
            label={STATUS_COPY.requests}
            value={STATUS_COPY.requestsNone}
            href="#"
          />
        </HeroRows>
        <WeekMoves
          moves={allMoves}
          done={[]}
          showCounter
          profileHref="#"
          onMark={noop}
          onCopyLink={noop}
        />
      </MentorHero>
    </div>
  ),
};

export const FirstBooked: Story = {
  render: () => (
    <div style={col}>
      <MentorHero {...HERO_COPY.firstBooked}>
        <NextSessionCard
          variant="hero"
          note={HERO_COPY.firstBookingNote}
          isLoading={false}
          error={null}
          onRetry={() => {}}
          booking={first}
          timeZone="Africa/Lagos"
          now={new Date()}
        />
        <HeroRows>
          <StatusLinkRow
            icon="travel_explore"
            label={STATUS_COPY.listed}
            value="Since Oct 18"
            href="#"
          />
          <StatusLinkRow icon="event_available" label={STATUS_COPY.openTimes} value="6" href="#" />
          <StatusLinkRow icon="event" label={STATUS_COPY.upcoming} value="1" href="#" />
        </HeroRows>
        <WeekMoves
          moves={['hours']}
          done={[]}
          showCounter={false}
          profileHref="#"
          onMark={noop}
          onCopyLink={noop}
        />
      </MentorHero>
    </div>
  ),
};

/** Each row loads and fails on its own: one loading, one failed, one with no date. */
export const RowStates: Story = {
  render: () => (
    <div style={col}>
      <MentorHero {...HERO_COPY.noBookings}>
        <HeroRows>
          <StatusLinkRow
            icon="travel_explore"
            label={STATUS_COPY.listed}
            value={STATUS_COPY.listedNoDate}
            href="#"
          />
          <StatusLinkRow
            icon="event_available"
            label={STATUS_COPY.openTimes}
            value={null}
            href="#"
          />
          <StatusLinkRow
            icon="inbox"
            label={STATUS_COPY.requests}
            value={STATUS_COPY.failed}
            href="#"
          />
        </HeroRows>
      </MentorHero>
    </div>
  ),
};

/** The booking card inside the hero while it loads and when it fails. */
export const FirstBookedCardStates: Story = {
  render: () => (
    <div style={{ ...col, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <MentorHero {...HERO_COPY.firstBooked}>
        <NextSessionCard
          variant="hero"
          isLoading
          error={null}
          onRetry={() => {}}
          booking={null}
          timeZone="Africa/Lagos"
          now={new Date()}
        />
      </MentorHero>
      <MentorHero {...HERO_COPY.firstBooked}>
        <NextSessionCard
          variant="hero"
          isLoading={false}
          error={{ status: 500, message: 'Server error' } as never}
          onRetry={() => {}}
          booking={null}
          timeZone="Africa/Lagos"
          now={new Date()}
        />
      </MentorHero>
    </div>
  ),
};

/** Two of the three moves pressed this week. */
export const MovesDone: Story = {
  render: () => (
    <div style={col}>
      <MentorHero {...HERO_COPY.noBookings}>
        <WeekMoves
          moves={allMoves}
          done={['share', 'hours']}
          showCounter
          profileHref="#"
          onMark={noop}
          onCopyLink={noop}
        />
      </MentorHero>
    </div>
  ),
};
