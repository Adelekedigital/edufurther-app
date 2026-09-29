import { Button } from '@/components/atoms/Button/Button';
import { ReviewNote } from '@/components/molecules/ReviewNote/ReviewNote';
import { ReviewsList } from '@/components/organisms/ReviewsList/ReviewsList';
import { ReviewsSummary } from '@/components/organisms/ReviewsSummary/ReviewsSummary';
import { REVIEW_PAGE_SIZE } from '@/lib/api/data/reviews';
import type { MentorProfile } from '@/types/mentor';
import type { useProfileReviewing } from './useProfileReviewing';

type ReviewsTabProps = {
  profile: MentorProfile;
  reviews: ReturnType<typeof useProfileReviewing>;
  /** The "no session yet" note may offer Book (it scrolls to the booking card). */
  offerBook: boolean;
  onBook: () => void;
};

/**
 * The Reviews tab (Mentor Profile.dc.html `tab=reviews`): the summary, the
 * viewer's note (your review is live / after your first session / how was
 * it?), then the list, with the guest gate.
 */
export function ReviewsTab({ profile: p, reviews: r, offerBook, onBook }: ReviewsTabProps) {
  const reviewsHref = `${p.mentor.profileHref}?tab=reviews`;
  return (
    <>
      <ReviewsSummary summary={p.reviews} firstName={p.mentor.firstName} />
      {r.mineOpen ? (
        <ReviewNote
          tone="success"
          icon="check_circle"
          title="Thanks, your review is live"
          body={`You can edit it until ${r.mineUntil}. After that it’s locked, and your next session can add a new one.`}
          action={
            <Button variant="secondary-outlined" size="medium" onClick={() => r.open('edit')}>
              Edit review
            </Button>
          }
        />
      ) : r.prompt === 'none' ? (
        <ReviewNote
          tone="neutral"
          icon="rate_review"
          title={`You can review ${p.mentor.firstName} after your first session`}
          body="Reviews come only from mentees who’ve had a session, so you can trust what you read."
          action={
            offerBook ? (
              <Button variant="secondary-outlined" size="medium" onClick={onBook}>
                Book a session
              </Button>
            ) : undefined
          }
        />
      ) : r.prompt === 'due' ? (
        <ReviewNote
          tone="info"
          icon="star"
          title={`How was your session with ${p.mentor.firstName}?`}
          body="Your review helps other mentees choose, and takes about a minute."
          action={
            r.canWrite ? (
              <Button size="medium" onClick={() => r.open('new')}>
                Write a review
              </Button>
            ) : undefined
          }
        />
      ) : null}
      <ReviewsList
        reviews={r.list.reviews}
        isLoading={r.list.isLoading}
        error={r.list.error}
        onRetry={r.list.retry}
        hasMore={r.list.hasMore}
        isLoadingMore={r.list.isLoadingMore}
        loadMoreError={r.list.loadMoreError}
        onLoadMore={r.list.loadMore}
        // What the next click loads: at most a page, from the unfiltered total
        // ("Show 5 more", not "Show 15 more").
        remaining={
          r.filter === null
            ? Math.min(p.reviews.count - r.list.reviews.length, REVIEW_PAGE_SIZE)
            : null
        }
        filters={p.sessionTypes.map((t) => ({ id: t.id, label: t.name }))}
        filter={r.filter}
        onFilter={r.setFilter}
        mine={
          r.mine
            ? {
                id: r.mine.id,
                edit: r.mineUntil ? { until: r.mineUntil, onEdit: () => r.open('edit') } : null,
              }
            : null
        }
        gate={
          r.isGuest
            ? {
                firstName: p.mentor.firstName,
                // Filtered, the total isn't known: no "+N more" count.
                total: r.filter === null ? p.reviews.count : r.list.reviews.length,
                signupHref: `/signup?next=${encodeURIComponent(reviewsHref)}`,
                loginHref: `/login?next=${encodeURIComponent(reviewsHref)}`,
              }
            : null
        }
      />
    </>
  );
}
