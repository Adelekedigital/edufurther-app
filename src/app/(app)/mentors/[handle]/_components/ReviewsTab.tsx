import { REVIEW_COPY } from '@/lib/copy/profile';
import { Button } from '@/components/atoms/Button/Button';
import { ReviewNote } from '@/components/molecules/ReviewNote/ReviewNote';
import { ReviewsList } from '@/components/organisms/ReviewsList/ReviewsList';
import { ReviewsSummary } from '@/components/organisms/ReviewsSummary/ReviewsSummary';
import { useGoogleSignUp } from '@/app/_shell/useGoogleSignUp';
import { REVIEW_PAGE_SIZE } from '@/lib/api/data/reviews';
import { newestFirst } from '@/lib/utils/reviewable';
import type { MentorProfile } from '@/types/mentor';
import type { useProfileReviewing } from './useProfileReviewing';

/** What the tab reads from useProfileReviewing (not the modal's state). */
export type ReviewsTabData = Pick<
  ReturnType<typeof useProfileReviewing>,
  | 'isGuest'
  | 'list'
  | 'filter'
  | 'setFilter'
  | 'prompt'
  | 'mine'
  | 'mineOpen'
  | 'mineUntil'
  | 'canWrite'
  | 'reviewable'
  | 'open'
>;

type ReviewsTabProps = {
  profile: MentorProfile;
  reviews: ReviewsTabData;
  /** The "no session yet" note may offer Book (it scrolls to the booking card). */
  offerBook: boolean;
  onBook: () => void;
  /** The profile's zone: the due note's session day is said in it. */
  timeZone: string;
};

/**
 * The Reviews tab (Mentor Profile.dc.html `tab=reviews`): the summary, the
 * viewer's note (your review is live / after your first session / how was
 * it?), then the list, with the guest gate.
 */
export function ReviewsTab({
  profile: p,
  reviews: r,
  offerBook,
  onBook,
  timeZone,
}: ReviewsTabProps) {
  // Our own mapped path (/mentors/{encoded handle}); the callback re-checks it
  // with safeReturnTo, so a sign-in only ever comes back on this site.
  const reviewsHref = `${p.mentor.profileHref}?tab=reviews`;
  const google = useGoogleSignUp();
  // The session a new review starts on: ReviewFlow's pick, the newest.
  const dueSession = newestFirst(r.reviewable.data ?? [])[0] ?? null;
  // Every review there is under the chosen chip: all of them, or the topic's
  // own count (backend #522), which is exactly what its filter pages through.
  const total =
    r.filter === null
      ? p.reviews.count
      : (p.reviews.topics.find((t) => t.slug === r.filter)?.count ?? null);
  return (
    <>
      {/* No reviews yet: nothing to summarise (Mentor Profile.dc.html `zeroReviews`). */}
      {p.reviews.count > 0 && <ReviewsSummary summary={p.reviews} firstName={p.mentor.firstName} />}
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
      ) : r.prompt !== null && typeof r.prompt === 'object' ? (
        // Mentor Profile.dc.html reviewState `again`: a new review, through the
        // same flow as a first one; both stay listed (owner, 21 Oct).
        <ReviewNote
          tone="info"
          icon="update"
          title={REVIEW_COPY.againTitle}
          body={REVIEW_COPY.againBody(p.mentor.firstName, r.prompt.lastReviewedAt)}
          action={
            r.canWrite ? (
              <Button size="medium" onClick={() => r.open('new')}>
                {REVIEW_COPY.againAction}
              </Button>
            ) : undefined
          }
        />
      ) : r.prompt === 'due' ? (
        <ReviewNote
          tone="info"
          icon="star"
          title={REVIEW_COPY.dueTitle(p.mentor.firstName)}
          body={REVIEW_COPY.dueBody(dueSession, timeZone)}
          action={
            r.canWrite ? (
              <Button size="medium" onClick={() => r.open('new')}>
                {REVIEW_COPY.dueAction}
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
        total={total}
        pageSize={REVIEW_PAGE_SIZE}
        // Chips by topic, without counts (Mentor Profile.dc.html draws none).
        filters={p.reviews.topics.map((t) => ({ id: t.slug, label: t.name }))}
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
                // A topic the profile no longer lists: no "+N more" count.
                total: total ?? r.list.reviews.length,
                signupHref: `/signup?next=${encodeURIComponent(reviewsHref)}`,
                loginHref: `/login?next=${encodeURIComponent(reviewsHref)}`,
                onGoogle: () => google.start(reviewsHref),
                googleBusy: google.busy,
                googleFailed: google.failed,
              }
            : null
        }
      />
    </>
  );
}
