'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { ProgressCircle } from '@/components/atoms/ProgressCircle/ProgressCircle';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { Star } from '@/components/atoms/Star/Star';
import { useMentorStats, type StatBlock } from '@/lib/api/data/mentorStats';
import { useMyReviewQuote, type ReviewQuote } from '@/lib/api/data/myReviews';
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
 * The design's three quality states (Mentor Dashboard v2.dc.html, `qualityState`):
 * at risk → `low`; otherwise `good` when the window has a rating to show,
 * `noReviews` when it doesn't. `noReviews` reads as on-track — it is not the
 * no-session empty state. Keyed off the window's own `averageRating` (the same
 * sync signal the no-reviews note uses), so the state can't disagree with the
 * note and never flickers on the async review quote.
 */
type QualityState = 'low' | 'good' | 'noReviews';
function qualityStateOf(rate: number, hasRating: boolean): QualityState {
  if (rate < GOOD_THRESHOLD) return 'low';
  return hasRating ? 'good' : 'noReviews';
}

/**
 * The line under the show-up rate, keyed on the same `good` state as the badge
 * so the two never contradict each other. When on track it reassures (noting a
 * rise if there is one); when at risk it names the missed sessions and treats a
 * rise as progress, not reassurance. Counts are plain, never a ratio: the
 * backend's attendance_rate can't be reconciled to these rows (mentee no-shows
 * raise it but aren't "completed", migrated sessions sit outside it), so the
 * ring stands alone. "Up" needs both windows' rates, so a first-ever previous
 * window (null) isn't a rise.
 */
function rateContext(current: StatBlock, previous: StatBlock, state: QualityState): string {
  const cur = current.attendanceRate;
  const prev = previous.attendanceRate;
  const rose = cur != null && prev != null && cur > prev;
  const missed = current.missedByMentor;
  // noReviews, clean record: lead with the sessions that went ahead rather than a
  // rating the mentor doesn't have yet. "Clean" means every booked session in the
  // window actually happened — no mentor miss, no cancellation, and no mentee
  // no-show — and at least one did, so the claim is always true. Anything else
  // falls through to the generic on-track line.
  if (
    state === 'noReviews' &&
    current.completedSessions > 0 &&
    missed === 0 &&
    current.cancelledByMentor === 0 &&
    current.missedByMentee === 0
  ) {
    const n = current.completedSessions;
    const went =
      n === 1 ? 'Your one booked session went ahead' : `All ${n} of your booked sessions went ahead`;
    return `${went}. Mentees can count on you.`;
  }
  if (state !== 'low') {
    if (rose) return `Up from ${prev}% last quarter. Mentees can count on you.`;
    return missed === 0
      ? `No sessions missed — mentees can count on you.`
      : `Mentees can count on you.`;
  }
  // At risk: name the misses when there are any; otherwise speak to the rate —
  // never a "0 missed" count. A rise is progress, not yet reassurance.
  if (missed > 0) {
    const misses = `${missed} missed session${missed === 1 ? '' : 's'} recently.`;
    return rose ? `Up from ${prev}% last quarter — ${misses}` : misses;
  }
  return rose
    ? `Up from ${prev}% last quarter — still below your usual.`
    : `Below your usual show-up rate.`;
}

/** "5 sessions in a row completed" / "1 session in a row completed". */
function streakLine(streak: number): string {
  return `${streak} session${streak === 1 ? '' : 's'} in a row completed`;
}

/**
 * The compact headline, keyed on the quality state. On track it leads with the
 * streak (the design's "N sessions in a row completed"), falling back to plain
 * reassurance when there is no streak; at risk it names the mentees left waiting.
 */
function teaserOf(
  state: QualityState,
  streak: number,
  missed: number,
): { text: string; icon: IconName; good: boolean } {
  if (state !== 'low') {
    const text = streak > 0 ? streakLine(streak) : 'You’re holding your sessions';
    return { text, icon: 'local_fire_department', good: true };
  }
  const text =
    missed > 0
      ? `${missed} ${missed === 1 ? 'mentee was' : 'mentees were'} left waiting in 90 days`
      : 'Your show-up rate is slipping';
  return { text, icon: 'error', good: false };
}

type BreakdownRow = {
  key: string;
  icon: IconName;
  iconClass: string | undefined;
  label: string;
  value: number;
  valueClass?: string | undefined;
};

/**
 * The three outcome rows the design shows — completed / canceled / missed-by-you
 * (Mentor Dashboard v2.dc.html). The mentee's own no-shows are deliberately not
 * surfaced to the mentor.
 */
function breakdownRows(current: StatBlock): BreakdownRow[] {
  const missed = current.missedByMentor;
  return [
    {
      key: 'completed',
      icon: 'check_circle',
      iconClass: styles.iconHeld,
      label: 'Sessions completed',
      value: current.completedSessions,
    },
    {
      key: 'canceled',
      icon: 'event_busy',
      iconClass: styles.iconMuted,
      label: 'Canceled by you',
      value: current.cancelledByMentor,
    },
    {
      key: 'missed',
      icon: 'person_off',
      iconClass: missed > 0 ? styles.iconMissed : styles.iconMuted,
      label: 'Missed by you',
      value: missed,
      valueClass: missed > 0 ? styles.rowValueMissed : undefined,
    },
  ];
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

/** The star row + rating value + a count-free link to the mentor's own Reviews tab. */
function RatingGroup({ rating, reviewCount, profileHref }: { rating: number; reviewCount: number; profileHref: string }) {
  return (
    <div className={styles.ratingGroup}>
      {/* The rating is conveyed by the img label; the count link sits outside it
          so a screen reader reaches it as a real link, not presentational text. */}
      <span className={styles.stars} role="img" aria-label={`Rated ${rating} out of 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={i <= Math.round(rating) ? styles.starOn : styles.starOff}>
            <Star size={16} />
          </span>
        ))}
      </span>
      <span className={styles.ratingValue} aria-hidden="true">
        {rating.toFixed(1)}
      </span>
      {/* The visible "(N)" is in the accessible name (WCAG 2.5.3 Label-in-Name,
          so "click 14" works), scoped so it never reads as the all-time total. */}
      <Link
        href={`${profileHref}?tab=reviews`}
        prefetch={false}
        className={styles.reviewCountLink}
        aria-label={`See all reviews — ${reviewCount} in the last 90 days`}
      >
        ({reviewCount})
      </Link>
    </div>
  );
}

/** A single mentee quote, clamped to three lines. */
function Quote({ quote }: { quote: ReviewQuote }) {
  return (
    <figure className={styles.quote}>
      <blockquote className={styles.quoteText}>“{quote.quote}”</blockquote>
      <figcaption className={styles.quoteBy}>{quote.by}</figcaption>
    </figure>
  );
}

/** Shown in both views when there is no review to quote (Mentor Dashboard v2.dc.html). */
function NoReviewsNote() {
  return (
    <div className={styles.noReviews}>
      <span className={styles.noReviewsTitle}>No reviews yet</span>
      <span className={styles.noReviewsBody}>Your latest mentee review will show here.</span>
    </div>
  );
}

/**
 * The Session-quality panel: the mentor's show-up rate as a ring, a compact
 * summary that expands to the full breakdown, their mentee-review quote, and one
 * state banner. Its own fetch (useMentorStats, 90-day window) drives all four
 * states — loading, error, empty (no settled session yet), content — with error
 * checked before empty so a failed load never reads as "no sessions".
 *
 * The review quote (useMyReviewQuote) is supplementary: its own loading, empty
 * and error are owned here, and a missing or failed quote never breaks the card.
 *
 * `profileHref` is the mentor's own profile path ('/mentors/{handle}'); the
 * review count links to its Reviews tab (`?tab=reviews`) so a mentor can read
 * what mentees wrote. Additive — not in the design (see design-divergence.md).
 */
export function SessionQuality({ userId, profileHref }: { userId: string; profileHref: string }) {
  const headingId = useId();
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);
  const stats = useMentorStats(userId, WINDOW_DAYS);
  const quote = useMyReviewQuote(userId);

  if (stats.isLoading) return <Loading />;
  if (stats.error) return <ErrorState onRetry={stats.retry} />;
  if (!stats.data) return <ErrorState onRetry={stats.retry} />;

  const { current, previous, currentStreak } = stats.data;
  if (current.attendanceRate == null) return <Empty />;

  const rate = current.attendanceRate;
  const missed = current.missedByMentor;
  const rating = current.averageRating;
  const reviewCount = current.reviewCount;
  const state = qualityStateOf(rate, rating != null);
  const good = state !== 'low';

  // Stars and the quote are independent. The stars are the 90-day window rating;
  // the quote is the latest all-time review (social proof), which can exist even
  // when the window itself has no rating. So: show the stars when the window has
  // a rating, show the quote whenever one was found, and otherwise — the window
  // has no rating and the quote is done (settled empty OR errored) with nothing
  // to show — fall back to the "no reviews yet" message rather than an empty
  // block. While the quote is still loading with no window rating, show neither:
  // never flash the fallback before the quote has had its say, and never leave a
  // failed request reading as "nothing here".
  const showNoReviews = rating == null && quote.data == null && !quote.isLoading;
  const teaser = teaserOf(state, currentStreak, missed);

  const toggleLabel = expanded
    ? 'Show less'
    : good
      ? 'See your full breakdown'
      : 'See what’s pulling this down';
  const toggleVariant = expanded ? 'text' : good ? 'secondary-outlined' : 'primary';

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
          <span className={styles.rateContext}>{rateContext(current, previous, state)}</span>
        </div>
      </div>

      <div id={panelId}>
        {expanded ? (
          <div className={styles.expanded}>
            <div className={styles.breakdown}>
              {breakdownRows(current).map((row) => (
                <div key={row.key} className={styles.row}>
                  <Icon name={row.icon} size={16} className={row.iconClass} />
                  <span className={styles.rowLabel}>{row.label}</span>
                  <span className={cx(styles.rowValue, row.valueClass)}>{row.value}</span>
                </div>
              ))}
            </div>

            <div className={styles.reviewsSection}>
              <div className={styles.reviewsHead}>
                <span className={styles.reviewsLabel}>Mentee reviews</span>
                {rating != null && (
                  <RatingGroup rating={rating} reviewCount={reviewCount} profileHref={profileHref} />
                )}
              </div>
              {quote.data && <Quote quote={quote.data} />}
              {showNoReviews && <NoReviewsNote />}
            </div>

            {good ? (
              <div className={styles.bannerGood}>
                <Icon name="local_fire_department" size={20} className={styles.bannerIconGood} />
                <p className={styles.bannerGoodText}>
                  {currentStreak > 0 ? (
                    <>
                      <strong className={styles.streak}>{streakLine(currentStreak)}</strong>. Keep it
                      going.
                    </>
                  ) : (
                    'You’re holding your sessions — keep it up.'
                  )}
                </p>
              </div>
            ) : (
              <div className={styles.bannerRisk}>
                <Icon name="error" size={20} className={styles.bannerIconRisk} />
                <div className={styles.bannerBody}>
                  {/*
                    The missed-count copy only holds when there are misses. An
                    at-risk rate almost always means a mentor no-show, but the
                    ring (attendance_rate) and this count aren't derivable from
                    one another, so guard the copy rather than assert a count we
                    can't stand behind.
                  */}
                  {missed > 0 ? (
                    <>
                      {/* The compact teaser carries the "in 90 days" qualifier;
                          the banner sits under the ring's "last 90 days" subline,
                          so it isn't repeated here (design). */}
                      <p className={styles.bannerTitle}>
                        {missed} {missed === 1 ? 'mentee was' : 'mentees were'} left waiting
                      </p>
                      <p className={styles.bannerText}>
                        Most missed sessions happen on hours you can’t really keep. Trim those hours,
                        or block the days you’ll be away.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className={styles.bannerTitle}>Your show-up rate is slipping</p>
                      <p className={styles.bannerText}>
                        Hold your upcoming booked sessions to bring it back up.
                      </p>
                    </>
                  )}
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
          </div>
        ) : (
          <div className={styles.compact}>
            <div className={cx(styles.teaser, teaser.good ? styles.teaserGood : styles.teaserRisk)}>
              <Icon
                name={teaser.icon}
                size={20}
                className={teaser.good ? styles.teaserIconGood : styles.teaserIconRisk}
              />
              <span className={styles.teaserText}>{teaser.text}</span>
            </div>

            {rating != null && (
              <div className={styles.ratingLine}>
                <span className={styles.ratingLineStar}>
                  <Star size={14} />
                </span>
                <strong className={styles.ratingLineValue}>{rating.toFixed(1)}</strong>
                <span>from {reviewCount}</span>
              </div>
            )}
            {quote.data && <Quote quote={quote.data} />}
            {showNoReviews && <NoReviewsNote />}
          </div>
        )}
      </div>

      <Button
        variant={toggleVariant}
        size="small"
        fullWidth={!expanded}
        icon={expanded ? 'expand_less' : 'expand_more'}
        iconPosition="trailing"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((v) => !v)}
      >
        {toggleLabel}
      </Button>
    </section>
  );
}
