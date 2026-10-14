'use client';

import { useId } from 'react';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { ProgressCircle } from '@/components/atoms/ProgressCircle/ProgressCircle';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { Star } from '@/components/atoms/Star/Star';
import { useMentorStats, type StatBlock } from '@/lib/api/data/mentorStats';
import { cx } from '@/lib/utils/cx';
import styles from './SessionQuality.module.css';

/** The window shown: the design's "last 90 days". */
const WINDOW_DAYS = 90;
/**
 * A show-up rate at or above this reads "On track"; below it "At risk". A UI
 * decision — the backend defines no quality cutoff (see design-divergence.md).
 */
const GOOD_THRESHOLD = 85;

/**
 * The line under the show-up rate. Rising reassures; otherwise it states the
 * mentor's own missed sessions as a plain count — never a ratio. The backend's
 * attendance_rate can't be reconciled to these rows (mentee no-shows raise it
 * but aren't "completed", and migrated sessions sit outside it), so the ring
 * stands on its own and this line never implies a denominator. "Up" needs both
 * windows' rates, so a first-ever previous window (null) falls to the count.
 */
function rateContext(current: StatBlock, previous: StatBlock): string {
  const cur = current.attendanceRate;
  const prev = previous.attendanceRate;
  if (cur != null && prev != null && cur > prev) {
    return `Up from ${prev}% last quarter. Mentees can count on you.`;
  }
  const missed = current.missedByMentor;
  return missed === 0
    ? `No sessions missed — mentees can count on you.`
    : `${missed} missed session${missed === 1 ? '' : 's'} recently.`;
}

function Loading() {
  return (
    <section className={styles.card} role="status" aria-busy>
      <span className="sr-only">Loading your session quality</span>
      <Skeleton width="150px" height="20px" />
      <div className={styles.showUp}>
        <Skeleton width="90px" height="90px" className={styles.skeletonCircle} />
        <div className={styles.showUpText}>
          <Skeleton width="110px" height="16px" />
          <Skeleton width="220px" height="14px" />
        </div>
      </div>
      <Skeleton height="104px" radius="md" />
    </section>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <section className={styles.card} role="alert">
      <h2 className={styles.title}>Session quality</h2>
      <p className={styles.errorText}>We couldn’t load your session quality.</p>
      <Button variant="secondary-outlined" size="small" onClick={onRetry}>
        Try again
      </Button>
    </section>
  );
}

/** attendanceRate is null — no settled session in the window yet. */
function Empty() {
  return (
    <section className={styles.card} aria-label="Session quality">
      <div className={styles.emptyBox}>
        <p className={styles.emptyTitle}>Starts after your first session</p>
        <p className={styles.emptyText}>
          We’ll track how reliably you show up and share mentee reviews here. Holding every booked
          session builds trust fast.
        </p>
      </div>
    </section>
  );
}

/**
 * The Session-quality panel: the mentor's show-up rate as a ring, the
 * held / canceled / missed breakdown, their mentee-review summary, and one
 * state banner. Its own fetch (useMentorStats, 90-day window) in all four
 * states — loading, error, empty (no settled session yet), content — with
 * error checked before empty so a failed load never reads as "no sessions".
 */
export function SessionQuality({ userId }: { userId: string }) {
  const headingId = useId();
  const { data, isLoading, error, retry } = useMentorStats(userId, WINDOW_DAYS);

  if (isLoading) return <Loading />;
  if (error) return <ErrorState onRetry={retry} />;
  if (!data) return <ErrorState onRetry={retry} />;

  const { current, previous } = data;
  if (current.attendanceRate == null) return <Empty />;

  const rate = current.attendanceRate;
  const good = rate >= GOOD_THRESHOLD;
  const missed = current.missedByMentor;
  const rating = current.averageRating;

  return (
    <section className={cx(styles.card, !good && styles.cardRisk)} aria-labelledby={headingId}>
      <header className={styles.header}>
        <div className={styles.headingGroup}>
          <h2 id={headingId} className={styles.title}>
            Session quality
          </h2>
          <span className={styles.subline}>
            How you show up for booked sessions · last 90 days
          </span>
        </div>
        <Badge type="accent" color={good ? 'green' : 'red'} size="sm">
          {good ? 'On track' : 'At risk'}
        </Badge>
      </header>

      <div className={styles.showUp}>
        <ProgressCircle
          value={rate}
          size="lg"
          tone={good ? 'success' : 'danger'}
          aria-label="Show-up rate"
        />
        <div className={styles.showUpText}>
          <span className={styles.showUpLabel}>Show-up rate</span>
          <span className={styles.rateContext}>{rateContext(current, previous)}</span>
        </div>
      </div>

      <div className={styles.breakdown}>
        <div className={styles.row}>
          <Icon name="check_circle" size={16} className={styles.iconHeld} />
          <span className={styles.rowLabel}>Sessions completed</span>
          <span className={styles.rowValue}>{current.completedSessions}</span>
        </div>
        <div className={styles.row}>
          <Icon name="event_busy" size={16} className={styles.iconMuted} />
          <span className={styles.rowLabel}>Canceled by you</span>
          <span className={styles.rowValue}>{current.cancelledByMentor}</span>
        </div>
        <div className={styles.row}>
          <Icon name="person_off" size={16} className={missed > 0 ? styles.iconMissed : styles.iconMuted} />
          <span className={styles.rowLabel}>Missed by you</span>
          <span className={cx(styles.rowValue, missed > 0 && styles.rowValueMissed)}>{missed}</span>
        </div>
      </div>

      <div className={styles.reviews}>
        <span className={styles.reviewsLabel}>Mentee reviews</span>
        {rating != null ? (
          <div className={styles.stars} role="img" aria-label={`Rated ${rating} out of 5`}>
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} className={i <= Math.round(rating) ? styles.starOn : styles.starOff}>
                <Star size={16} />
              </span>
            ))}
            <span className={styles.ratingValue}>{rating.toFixed(1)}</span>
            <span className={styles.reviewCount}>({current.reviewCount})</span>
          </div>
        ) : (
          <span className={styles.noReviews}>No reviews yet</span>
        )}
      </div>

      {good ? (
        <div className={styles.bannerGood}>
          <Icon name="local_fire_department" size={20} className={styles.bannerIconGood} />
          <p className={styles.bannerGoodText}>You’re holding your sessions — keep it up.</p>
        </div>
      ) : (
        <div className={styles.bannerRisk}>
          <Icon name="error" size={20} className={styles.bannerIconRisk} />
          <div className={styles.bannerBody}>
            <p className={styles.bannerTitle}>
              {missed} {missed === 1 ? 'mentee was' : 'mentees were'} left waiting
            </p>
            <p className={styles.bannerText}>
              Most missed sessions happen on hours you can’t really keep. Trim those hours, or block
              the days you’ll be away.
            </p>
            <div className={styles.bannerActions}>
              <ButtonLink href="/calendar" size="small">
                Review your hours
              </ButtonLink>
              <ButtonLink href="/bookings" variant="text" size="small">
                See missed sessions
              </ButtonLink>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
