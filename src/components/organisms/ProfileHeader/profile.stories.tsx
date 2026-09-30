import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { Button } from '@/components/atoms/Button/Button';
import { CoverPicker } from '@/components/molecules/CoverPicker/CoverPicker';
import { ReviewNote } from '@/components/molecules/ReviewNote/ReviewNote';
import { ShareMenu } from '@/components/molecules/ShareMenu/ShareMenu';
import type { CoverArt, CoverKey } from '@/lib/utils/cover';
import { BookSessionCard } from '../BookSessionCard/BookSessionCard';
import { FirstMenteesCard } from '../FirstMenteesCard/FirstMenteesCard';
import { ProfileOverview } from '../ProfileOverview/ProfileOverview';
import { ReviewFlow, type ReviewFlowProps } from '../ReviewFlow/ReviewFlow';
import { ReviewsList } from '../ReviewsList/ReviewsList';
import { ReviewsSummary } from '../ReviewsSummary/ReviewsSummary';
import { SimilarMentorsCard } from '../SimilarMentorsCard/SimilarMentorsCard';
import { similarMentors } from '../SimilarMentorsCard/similar.fixture';
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
/** A status where Book would be ("Not taking bookings"; provisional). */
export const HeaderNotTaking: Story = {
  render: () => (
    <div style={wide}>
      <ProfileHeader
        profile={fullProfile}
        status="Not taking bookings"
        actions={<ShareMenu url="https://edufurther.com/mentors/gbenga" name="Gbenga Elufisan" />}
      />
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

/** Cover art over a chosen colour: topic icons, the dot pattern, one large icon. */
export const HeaderCoverArt: Story = {
  render: () => (
    <div style={{ ...wide, display: 'grid', gap: 24 }}>
      {(['icons', 'pattern', 'single'] as const).map((art, i) => (
        <ProfileHeader
          key={art}
          profile={{
            ...fullProfile,
            cover: { color: (['mint', 'peach', 'lilac'] as const)[i]!, art },
          }}
        />
      ))}
    </div>
  ),
};

/** The owner's "Change cover", saving to local state (the page saves to the API). */
function OwnerCover() {
  const [color, setColor] = useState<CoverKey>('sky');
  const [art, setArt] = useState<CoverArt>('none');
  const [savedAt, setSavedAt] = useState(0);
  return (
    <ProfileHeader
      profile={{ ...fullProfile, cover: { color, art } }}
      bannerTools={
        <CoverPicker
          color={color}
          artOn={art !== 'none'}
          onPickColor={(k) => {
            setColor(k);
            setSavedAt(Date.now());
          }}
          onToggleArt={(on) => {
            setArt(on ? 'icons' : 'none');
            setSavedAt(Date.now());
          }}
          saveState={savedAt ? 'saved' : 'idle'}
          savedStamp={savedAt}
          hasImage={false}
          onFile={fn()}
          uploading={false}
          onRemoveImage={fn()}
          removing={false}
          imageError={null}
          accept="image/jpeg,image/png,image/webp"
        />
      }
    />
  );
}
export const HeaderOwnerCover: Story = {
  render: () => (
    <div style={wide}>
      <OwnerCover />
    </div>
  ),
};
export const HeaderOwnerCoverPhone: Story = {
  globals: { viewport: { value: 'mobile2', isRotated: false } },
  render: () => <OwnerCover />,
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

/** The owner: "Add education" / "Add award", Edit on each row, the funding badge. */
export const OverviewOwner: Story = {
  render: () => (
    <div style={{ maxWidth: 640 }}>
      <ProfileOverview
        profile={fullProfile}
        onEditBackground={fn()}
        awardsEdit={{ onAdd: fn(), onEdit: fn() }}
        educationEdit={{ onAdd: fn(), onEdit: fn() }}
      />
    </div>
  ),
};
/** The owner with nothing added: an invitation in each section. */
export const OverviewOwnerEmpty: Story = {
  render: () => (
    <div style={{ maxWidth: 640 }}>
      <ProfileOverview
        profile={{ ...newProfile, awards: [], education: [] }}
        onEditBackground={fn()}
        awardsEdit={{ onAdd: fn(), onEdit: fn() }}
        educationEdit={{ onAdd: fn(), onEdit: fn() }}
      />
    </div>
  ),
};
/** A long award name and "Partial funding" beside the Edit. */
export const OverviewOwnerLongAward: Story = {
  render: () => (
    <div style={{ maxWidth: 640 }}>
      <ProfileOverview
        profile={{
          ...fullProfile,
          awards: [
            {
              ...fullProfile.awards[0]!,
              title:
                'Mastercard Foundation Scholars Program at the University of Edinburgh School of Social and Political Science',
              funding: 'partial',
            },
          ],
        }}
        awardsEdit={{ onAdd: fn(), onEdit: fn() }}
        educationEdit={{ onAdd: fn(), onEdit: fn() }}
      />
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

/** Not taking bookings (backend #301): one, several and none visible. Provisional. */
export const BookCardNotTaking: Story = {
  render: () => (
    <div style={{ ...side, display: 'grid', gap: 16 }}>
      {[[sessionTypes[0]!], sessionTypes, []].map((types, i) => (
        <BookSessionCard
          key={i}
          sessionTypes={types}
          onBook={fn()}
          onCompare={fn()}
          bookBlocked={null}
          notTaking
        />
      ))}
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

// ---- Similar mentors ---------------------------------------------------------

export const SimilarMentors: Story = {
  render: () => (
    <div style={side}>
      <SimilarMentorsCard
        mentors={similarMentors}
        isLoading={false}
        timeZone="Africa/Lagos"
        seeAllHref="/explore"
      />
    </div>
  ),
};

export const SimilarMentorsLoading: Story = {
  render: () => (
    <div style={side}>
      <SimilarMentorsCard mentors={null} isLoading timeZone="Africa/Lagos" seeAllHref="/explore" />
    </div>
  ),
};

// ---- Writing a review (ReviewModal.dc.html) -----------------------------------

const flow: ReviewFlowProps = {
  mode: 'new',
  mentorFirstName: 'Gbenga',
  sessions: [
    { id: 's1', startsAt: '2026-09-19T15:00:00Z', typeName: 'SOP review' },
    { id: 's2', startsAt: '2026-09-10T15:00:00Z', typeName: 'Mock visa interview' },
  ],
  editableUntil: '2026-09-29T12:05:00Z',
  author: { name: 'Esther', initials: 'E', institution: null },
  timeZone: 'Africa/Lagos',
  onSend: fn(),
  pending: false,
  error: null,
  done: false,
  onClose: fn(),
  onBookAgain: fn(),
  renderShell: (shell, body) => (
    <div style={{ maxWidth: 480, padding: 24, border: '1px solid var(--ink-200)' }}>
      <h2 style={{ margin: 0 }}>{shell.title}</h2>
      <p>{shell.subtitle}</p>
      {body}
    </div>
  ),
};

export const ReviewWrite: Story = { render: () => <ReviewFlow {...flow} /> };

export const ReviewEdit: Story = {
  render: () => (
    <ReviewFlow
      {...flow}
      mode="edit"
      sessionLabel="SOP review · Sep 19"
      initial={{ overall: 4, text: 'Practical, direct feedback on my SOP draft.' }}
    />
  ),
};

export const ReviewDone: Story = {
  render: () => (
    <ReviewFlow
      {...flow}
      done
      initial={{ overall: 5, text: 'We rewrote my SOP opening together. It finally reads well.' }}
    />
  ),
};

export const ReviewSendFailed: Story = {
  render: () => <ReviewFlow {...flow} error="We couldn’t send your review. Try again." />,
};
