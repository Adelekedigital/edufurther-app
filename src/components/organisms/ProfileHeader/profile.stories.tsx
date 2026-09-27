import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { Button } from '@/components/atoms/Button/Button';
import { ShareMenu } from '@/components/molecules/ShareMenu/ShareMenu';
import { BookSessionCard } from '../BookSessionCard/BookSessionCard';
import { ProfileOverview } from '../ProfileOverview/ProfileOverview';
import { SessionTypeList } from '../SessionTypeList/SessionTypeList';
import { TrackRecordCard } from '../TrackRecordCard/TrackRecordCard';
import { ProfileHeader } from './ProfileHeader';
import { fullProfile, newProfile, sessionTypes } from './profile.fixture';

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
        mentor={fullProfile.mentor}
        sessionTypes={[sessionTypes[0]!]}
        onBook={fn()}
        onCompare={fn()}
        bookBlocked={null}
        timeZone="America/New_York"
      />
    </div>
  ),
};
export const BookCardSeveral: Story = {
  render: () => (
    <div style={side}>
      <BookSessionCard
        mentor={fullProfile.mentor}
        sessionTypes={sessionTypes}
        onBook={fn()}
        onCompare={fn()}
        bookBlocked={null}
        timeZone="America/New_York"
      />
    </div>
  ),
};
export const BookCardNoOpenTimes: Story = {
  render: () => (
    <div style={side}>
      <BookSessionCard
        mentor={newProfile.mentor}
        sessionTypes={[sessionTypes[0]!]}
        onBook={fn()}
        onCompare={fn()}
        bookBlocked={null}
        timeZone="America/New_York"
      />
    </div>
  ),
};
export const BookCardBlocked: Story = {
  render: () => (
    <div style={side}>
      <BookSessionCard
        mentor={fullProfile.mentor}
        sessionTypes={[sessionTypes[0]!]}
        onBook={fn()}
        onCompare={fn()}
        bookBlocked="Booking needs a connection"
        timeZone="America/New_York"
      />
    </div>
  ),
};

export const TrackRecord: Story = {
  render: () => (
    <div style={side}>
      <TrackRecordCard profile={fullProfile} isOwner={false} />
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
        isOwner={false}
      />
    </div>
  ),
};
export const TrackRecordNewMentor: Story = {
  render: () => (
    <div style={side}>
      <TrackRecordCard profile={newProfile} isOwner={false} />
    </div>
  ),
};
export const TrackRecordNewMentorOwner: Story = {
  render: () => (
    <div style={side}>
      <TrackRecordCard profile={newProfile} isOwner />
    </div>
  ),
};
