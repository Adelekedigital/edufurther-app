import Link from 'next/link';
import { ButtonLink } from '@/components/atoms/Button/Button';
import { Chip } from '@/components/atoms/Chip/Chip';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { FieldError } from '@/components/molecules/FieldError/FieldError';
import { GoogleButton } from '@/components/molecules/GoogleButton/GoogleButton';
import { LoadMore } from '@/components/molecules/LoadMore/LoadMore';
import { Notice } from '@/components/molecules/Notice/Notice';
import { ReviewItem } from '@/components/molecules/ReviewItem/ReviewItem';
import { GOOGLE_SIGN_IN_FAILED } from '@/lib/copy/auth';
import { LOAD_MORE_COPY, showMoreLabel, showingCaption } from '@/lib/copy/loadMore';
import type { AppError, Review } from '@/types/mentor';
import { REVIEWS_EMPTY } from '@/lib/copy/profile';
import styles from './ReviewsList.module.css';

type Gate = {
  firstName: string;
  total: number;
  signupHref: string;
  loginHref: string;
  /** "Continue with Google": the page starts the sign-up and brings them back here. */
  onGoogle: () => void;
  /** Held from the press until the browser leaves for Google. */
  googleBusy: boolean;
  /** Google sign-in didn't start: said under the buttons. */
  googleFailed: boolean;
};

type ReviewsListProps = {
  reviews: Review[];
  isLoading: boolean;
  error: AppError | null;
  onRetry: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMoreError: AppError | null;
  onLoadMore: () => void;
  /**
   * Every review there is under the filter, when known (all of them, or the
   * topic's count): "Show 2 more reviews" and "Showing 5 of 7". Null: a full
   * page, no caption.
   */
  total: number | null;
  /** How many one click loads. */
  pageSize: number;
  /** Topics to filter by (`id` is the offering slug). Fewer than two: no chips. */
  filters: { id: string; label: string }[];
  /** The chosen topic; null = All. */
  filter: string | null;
  onFilter: (id: string | null) => void;
  /**
   * A guest sees the first review without its text, then this sign-up card
   * (Mentor Profile.dc.html `gated`).
   */
  gate: Gate | null;
  /** The viewer's own review; `edit` while it can still be edited. */
  mine?: { id: string; edit: { until: string; onEdit: () => void } | null } | null;
};

/**
 * Mentor Profile.dc.html Reviews tab, below the summary: the filter chips and
 * the list, newest first. Four states: loading, error, empty (none yet, or none
 * for a filter), content.
 */
export function ReviewsList(p: ReviewsListProps) {
  const guest = p.gate !== null;
  // No reviews at all (Mentor Profile.dc.html `zeroReviews`): no chips or order
  // to offer, only the line saying so.
  const none = !p.isLoading && !p.error && p.filter === null && p.reviews.length === 0;
  return (
    <div className={styles.wrap}>
      {!none && (
        <div className={styles.bar}>
          {p.filters.length > 1 && (
            <div className={styles.chips} role="group" aria-label="Filter reviews by topic">
              <Chip look="pill" pressed={p.filter === null} onClick={() => p.onFilter(null)}>
                All
              </Chip>
              {p.filters.map((f) => (
                <Chip
                  key={f.id}
                  look="pill"
                  pressed={p.filter === f.id}
                  onClick={() => p.onFilter(f.id)}
                >
                  {f.label}
                </Chip>
              ))}
            </div>
          )}
          <span className={styles.order}>Most recent first</span>
        </div>
      )}

      {p.isLoading ? (
        <div className={styles.list} aria-busy>
          <span className="sr-only" role="status">
            Loading reviews
          </span>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.skItem}>
              <div className={styles.skHead}>
                <Skeleton width="40px" height="40px" className={styles.skAvatar} />
                <div className={styles.skLines}>
                  <Skeleton width="30%" height="14px" radius="md" />
                  <Skeleton width="45%" height="12px" radius="md" />
                </div>
              </div>
              <Skeleton height="14px" radius="md" />
              <Skeleton width="70%" height="14px" radius="md" />
            </div>
          ))}
        </div>
      ) : p.error ? (
        // Error before empty (ui-states).
        <Notice tone="neutral" icon="error" title="We couldn’t load reviews">
          {p.error.kind === 'offline'
            ? 'You’re offline. Reviews load again once you’re back online.'
            : 'Something went wrong on our side.'}{' '}
          <button type="button" className={styles.inlineAction} onClick={p.onRetry}>
            Try again
          </button>
        </Notice>
      ) : p.reviews.length === 0 ? (
        <p className={styles.empty} role="status">
          {p.filter === null ? REVIEWS_EMPTY.all : REVIEWS_EMPTY.filtered}
        </p>
      ) : (
        <div className={styles.list}>
          {p.reviews.map((r) => (
            <ReviewItem
              key={r.id}
              review={r}
              redacted={guest}
              mine={!!p.mine && p.mine.id === r.id}
              edit={p.mine && p.mine.id === r.id ? (p.mine.edit ?? undefined) : undefined}
            />
          ))}
          {!guest && (p.hasMore || p.loadMoreError) && (
            <LoadMore
              className={styles.more}
              label={showMoreLabel(
                p.pageSize,
                p.total !== null ? p.total - p.reviews.length : null,
                LOAD_MORE_COPY.reviews.noun,
              )}
              caption={p.total !== null ? showingCaption(p.reviews.length, p.total) : undefined}
              onLoadMore={p.onLoadMore}
              busy={p.isLoadingMore}
              error={p.loadMoreError ? LOAD_MORE_COPY.reviews.failed : null}
            />
          )}
          {p.gate && <GateCard {...p.gate} shown={p.reviews.length} />}
        </div>
      )}
    </div>
  );
}

function GateCard({
  firstName,
  total,
  shown,
  signupHref,
  loginHref,
  onGoogle,
  googleBusy,
  googleFailed,
}: Gate & { shown: number }) {
  const more = total - shown;
  return (
    <div className={styles.gateWrap}>
      <div className={styles.gate}>
        {more > 0 && (
          <span className={styles.gatePill}>
            <Icon name="lock" size={16} />
            {`+${more} more ${more === 1 ? 'review' : 'reviews'} from mentees`}
          </span>
        )}
        <h3 className={styles.gateTitle}>See what mentees say about {firstName}</h3>
        <p className={styles.gateBody}>
          Create a free account to read every review and book a session with {firstName}.
        </p>
        {/* No prefetch: the card renders late (after the reviews load) and the
            auth pages aren't worth fetching for every guest who scrolls past. */}
        <div className={styles.gateActions}>
          <ButtonLink href={signupHref} size="medium" prefetch={false}>
            Continue with email
          </ButtonLink>
          <GoogleButton size="medium" busy={googleBusy} onClick={onGoogle} />
        </div>
        {googleFailed && <FieldError>{GOOGLE_SIGN_IN_FAILED}</FieldError>}
        <span className={styles.gateLogin}>
          Already have an account?{' '}
          <Link href={loginHref} prefetch={false}>
            Log in
          </Link>
        </span>
      </div>
    </div>
  );
}
