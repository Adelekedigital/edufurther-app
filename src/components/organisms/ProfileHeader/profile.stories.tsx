import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { Button } from '@/components/atoms/Button/Button';
import { ReviewNote } from '@/components/molecules/ReviewNote/ReviewNote';
import { ShareMenu } from '@/components/molecules/ShareMenu/ShareMenu';
import { BookSessionCard } from '../BookSessionCard/BookSessionCard';
import { FirstMenteesCard } from '../FirstMenteesCard/FirstMenteesCard';
import { ProfileOverview } from '../ProfileOverview/ProfileOverview';
import { ReviewsList } from '../ReviewsList/ReviewsList';
import { ReviewsSummary } from '../ReviewsSummary/ReviewsSummary';
import { SessionTypeList } from '../SessionTypeList/SessionTypeList';
import { TrackRecordCard } from '../TrackRecordCard/TrackRecordCard';
import { ProfileHeader } from './ProfileHeader';
import { fullProfile, newProfile, reviews, sessionTypes } from './profile.fixture';

/** The Mentor Profile organisms, each on its own, with full and empty data. */
const meta: Meta = { title: 'Organisms/Mentor profile' };
export default meta;
type Story = StoryObj;

const wide = { maxWidth: 1120 };
const side = { maxWidth: 420 };
const actions = (
  <>
    <Button>Book a session</Button>
    <ShareMenu url="https://edufurther.com/mentors/gbenga" name="Gbenga Elufisan" />
  </>
);

export const Header: Story = {
  render: () => (
    <div style={wide}>
      <ProfileHeader profile={fullProfile} actions={actions} />
    </div>
  ),
};
/** No reviews, no sessions, no headline or background, a long name. */
export const HeaderNewMentor: Story = {
  render: () => (
    <div style={wide}>
      <ProfileHeader profile={newProfile} actions={actions} />
    </div>
  ),
};
export const HeaderPhone: Story = {
  globals: { viewport: { value: 'mobile2', isRotated: false } },
  render: () => <ProfileHeader profile={fullProfile} actions={actions} />,
};

export const Overview: Story = {
  render: () => (
    <div style={{ maxWidth: 640 }}>
      <ProfileOverview profile={fullProfile} />
    </div>
  ),
};
/** Education only: every optional section leaves itself out. */
export const OverviewSparse: Story = {
  render: () => (
    <div style={{ maxWidth: 640 }}>
      <ProfileOverview profile={newProfile} />
    </div>
  ),
};

export const Sessions: Story = {
  render: () => (
    <div style={{ maxWidth: 860 }}>
      <SessionTypeList sessionTypes={sessionTypes} onBook={fn()} bookBlocked={null} canBook />
    </div>
  ),
};

export const BookCardOneOffering: Story = {
  render: () => (
    <div style={side}>
      <BookSessionCard
        sessionTypes={[sessionTypes[0]!]}
        onBook={fn()}
        onCompare={fn()}
        bookBlocked={null}
      />
    </div>
  ),
};
export const BookCardSeveral: Story = {
  render: () => (
    <div style={side}>
      <BookSessionCard
        sessionTypes={sessionTypes}
        onBook={fn()}
        onCompare={fn()}
        bookBlocked={null}
      />
    </div>
  ),
};
export const BookCardBlocked: Story = {
  render: () => (
    <div style={side}>
      <BookSessionCard
        sessionTypes={[sessionTypes[0]!]}
        onBook={fn()}
        onCompare={fn()}
        bookBlocked="Booking needs a connection"
      />
    </div>
  ),
};

export const TrackRecord: Story = {
  render: () => (
    <div style={side}>
      <TrackRecordCard profile={fullProfile} />
    </div>
  ),
};
export const TrackRecordNoReviews: Story = {
  render: () => (
    <div style={side}>
      <TrackRecordCard
        profile={{
          ...fullProfile,
          mentor: { ...fullProfile.mentor, reviewCount: 0, rating: null },
          attendanceRate: null,
        }}
      />
    </div>
  ),
};
/** 1–2 sessions: the stats show, the rating band waits for 3 (design). */
export const TrackRecordTwoSessions: Story = {
  render: () => (
    <div style={side}>
      <TrackRecordCard
        profile={{
          ...fullProfile,
          mentor: { ...fullProfile.mentor, completedSessions: 2, reviewCount: 1, rating: 5 },
          menteesMentored: 1,
        }}
      />
    </div>
  ),
};
const next = '2026-09-28T13:00:00Z';
export const FirstMentees: Story = {
  render: () => (
    <div style={side}>
      <FirstMenteesCard
        variant="mentee"
        firstName="Adaeze"
        nextTime={next}
        timeZone="America/New_York"
        move={{ from: 'Nigeria', to: 'the United Kingdom' }}
        award="Commonwealth Scholarship"
        onBook={fn()}
      />
    </div>
  ),
};
/** Nothing open, no move, no award: no facts box, no Book button. */
export const FirstMenteesNoTimes: Story = {
  render: () => (
    <div style={side}>
      <FirstMenteesCard
        variant="mentee"
        firstName="Chukwuemeka-Oluwaseun"
        nextTime={null}
        timeZone="America/New_York"
        move={null}
        award={null}
        onBook={fn()}
      />
    </div>
  ),
};
export const FirstMenteesOwner: Story = {
  render: () => (
    <div style={side}>
      <FirstMenteesCard variant="owner" onShare={fn()} />
    </div>
  ),
};
export const FirstMenteesPhone: Story = {
  globals: { viewport: { value: 'mobile2', isRotated: false } },
  render: () => (
    <FirstMenteesCard
      variant="mentee"
      firstName="Adaeze"
      nextTime={next}
      timeZone="Africa/Lagos"
      move={{ from: 'Ghana', to: 'Canada' }}
      award={null}
      onBook={fn()}
    />
  ),
};

// ---- Reviews tab ------------------------------------------------------------

const main = { maxWidth: 680, display: 'flex', flexDirection: 'column' as const, gap: 24 };
const list = {
  reviews,
  isLoading: false,
  error: null,
  onRetry: fn(),
  hasMore: true,
  isLoadingMore: false,
  loadMoreError: null,
  onLoadMore: fn(),
  remaining: 2,
  filters: sessionTypes.map((t) => ({ id: t.id, label: t.name })),
  filter: null,
  onFilter: fn(),
  gate: null,
};

export const Reviews: Story = {
  render: () => (
    <div style={main}>
      <ReviewsSummary summary={fullProfile.reviews} firstName="Gbenga" />
      <ReviewsList {...list} />
    </div>
  ),
};

export const ReviewsSummarySparse: Story = {
  render: () => (
    <div style={main}>
      <ReviewsSummary
        summary={{
          count: 1,
          rating: 4,
          wouldRecommendIn10: null,
          attributes: { communication: 80, knowledge: null, support: null, practicality: null },
        }}
        firstName="Ada"
      />
    </div>
  ),
};

export const ReviewsLoading: Story = {
  render: () => (
    <div style={main}>
      <ReviewsList {...list} reviews={[]} isLoading />
    </div>
  ),
};

export const ReviewsError: Story = {
  render: () => (
    <div style={main}>
      <ReviewsList {...list} reviews={[]} error={{ kind: 'server', message: 'x' }} />
    </div>
  ),
};

export const ReviewsEmptyFilter: Story = {
  render: () => (
    <div style={main}>
      <ReviewsList {...list} reviews={[]} filter={sessionTypes[1]!.id} />
    </div>
  ),
};

export const ReviewsGuest: Story = {
  render: () => (
    <div style={main}>
      <ReviewsList
        {...list}
        reviews={[{ ...reviews[0]!, text: '' }]}
        gate={{ firstName: 'Gbenga', total: 7, signupHref: '/signup', loginHref: '/login' }}
      />
    </div>
  ),
};

export const ReviewNotes: Story = {
  render: () => (
    <div style={main}>
      <ReviewNote
        tone="neutral"
        icon="rate_review"
        title="You can review Gbenga after your first session"
        body="Reviews come only from mentees who’ve had a session, so you can trust what you read."
        action={
          <Button variant="secondary-outlined" size="small">
            Book a session
          </Button>
        }
      />
      <ReviewNote
        tone="info"
        icon="star"
        title="How was your session with Gbenga?"
        body="Your review helps other mentees choose, and takes about a minute."
      />
    </div>
  ),
};
