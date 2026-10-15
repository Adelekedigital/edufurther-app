'use client';

import { useEffect, useId, useRef, useState } from 'react';
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
 * The line under the show-up rate, keyed on the same `onTrack` signal as the
 * badge so the two never contradict each other. When on track it reassures (noting a
 * rise if there is one); when at risk it names the missed sessions and treats a
 * rise as progress, not reassurance. Counts are plain, never a ratio: the
 * backend's attendance_rate can't be reconciled to these rows (mentee no-shows
 * raise it but aren't "completed", migrated sessions sit outside it), so the
 * ring stands alone. "Up" needs both windows' rates, so a first-ever previous
 * window (null) isn't a rise.
 */
function rateContext(
  current: StatBlock,
  previous: StatBlock,
  onTrack: boolean,
  noReviews: boolean,
): string {
  const cur = current.attendanceRate;
  const prev = previous.attendanceRate;
  const rose = cur != null && prev != null && cur > prev;
  const missed = current.missedByMentor;
  // noReviews, clean record: lead with the sessions that went ahead rather than a
  // rating the mentor doesn't have yet. Only when the ring itself reads 100% AND
  // every row is clean — no mentor miss, no cancellation, no mentee no-show — and
  // at least one session completed, so the claim never contradicts the ring beside
  // it (the rows and the ring don't always reconcile) or a row in the breakdown.
  // Anything else falls through to the generic on-track line.
  if (
    noReviews &&
    cur === 100 &&
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
  if (onTrack) {
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
  onTrack: boolean,
  streak: number,
  leftWaiting: number,
  displayRate: number,
): { text: string; icon: IconName; good: boolean } {
  if (onTrack) {
    const text = streak > 0 ? streakLine(streak) : 'You’re holding your sessions';
    return { text, icon: 'local_fire_department', good: true };
  }
  const text =
    leftWaiting > 0
      ? `${leftWaiting} ${leftWaiting === 1 ? 'mentee was' : 'mentees were'} left waiting in 90 days`
      : `Your show-up rate is ${displayRate}%`;
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

/** Shown when there is no review to quote (Mentor Dashboard v2.dc.html). */
function NoReviewsNote() {
  return (
    <div className={styles.noReviews}>
      <Icon name="star" size={16} className={styles.noReviewsIcon} />
      <div className={styles.noReviewsText}>
        <span className={styles.noReviewsTitle}>No reviews yet</span>
        <span className={styles.noReviewsBody}>Your latest mentee review will show here.</span>
      </div>
    </div>
  );
}

/** The review slot, in every view: the latest review quote, the no-reviews note, or nothing yet. */
function ReviewSlot({ quoteData, showNote }: { quoteData: ReviewQuote | null; showNote: boolean }) {
  if (quoteData) return <Quote quote={quoteData} />;
  if (showNote) return <NoReviewsNote />;
  return null;
}

/** The outcome rows — inline in the no-reviews view, and inside the expanded view. */
function Breakdown({ current }: { current: StatBlock }) {
  return (
    <div className={styles.breakdown}>
      {breakdownRows(current).map((row) => (
        <div key={row.key} className={styles.row}>
          <Icon name={row.icon} size={16} className={row.iconClass} />
          <span className={styles.rowLabel}>{row.label}</span>
          <span className={cx(styles.rowValue, row.valueClass)}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

/** The compact headline chip, tinted on the on-track / at-risk state. */
function Teaser({ teaser }: { teaser: { text: string; icon: IconName; good: boolean } }) {
  return (
    <div className={cx(styles.teaser, teaser.good ? styles.teaserGood : styles.teaserRisk)}>
      <Icon
        name={teaser.icon}
        size={20}
        className={teaser.good ? styles.teaserIconGood : styles.teaserIconRisk}
      />
      <span className={styles.teaserText}>{teaser.text}</span>
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

  const headingRef = useRef<HTMLHeadingElement>(null);
  const prevExpandable = useRef(false);
  // If a refetch makes an open panel non-expandable (on track, and the window
  // rating just went null), the focused control in the expanded view unmounts and
  // focus falls to <body>. Move it to the card heading so a keyboard or screen
  // reader keeps its place — but only when focus actually fell to <body>, so focus
  // elsewhere on the page is never stolen. (Mirrors the `canExpand` rule below; it
  // is computed here from the raw data because the hook must sit above the early
  // returns.)
  useEffect(() => {
    const c = stats.data?.current;
    const expandable =
      c?.attendanceRate != null && (c.attendanceRate < GOOD_THRESHOLD || c.averageRating != null);
    if (prevExpandable.current && !expandable && document.activeElement === document.body) {
      headingRef.current?.focus();
    }
    prevExpandable.current = expandable;
  }, [stats.data]);

  if (stats.isLoading) return <Loading />;
  if (stats.error) return <ErrorState onRetry={stats.retry} />;
  if (!stats.data) return <ErrorState onRetry={stats.retry} />;

  const { current, previous, currentStreak } = stats.data;
  if (current.attendanceRate == null) return <Empty />;

  const rate = current.attendanceRate;
  // The ring, badge, and headline all show the same rounded integer, so the
  // on-track decision is made on that integer too. Otherwise a rate like 84.6
  // rounds to a displayed "85%" while the raw value (< 85) still badges "At risk".
  const displayRate = Math.round(rate);
  // "Missed by you" (the breakdown row) is every mentor no-show; the "left
  // waiting" headline is only the ones where a mentee was actually present
  // (mentees_left_waiting), so the two can differ. Clamp to the row's count (the
  // backend's own invariant, #466) so the headline can never exceed the row
  // rendered beside it, even if the backend drifts.
  const leftWaiting = Math.min(current.menteesLeftWaiting, current.missedByMentor);
  const rating = current.averageRating;
  const reviewCount = current.reviewCount;
  const onTrack = displayRate >= GOOD_THRESHOLD;
  // The quote is the latest review (social proof); it shows whenever one exists
  // and is never gated on the 90-day window. The "no reviews yet" note stands in
  // only when there is genuinely no review to show, and only once the fetch has
  // settled, so it never flashes before the quote arrives.
  const showNote = rating == null && quote.data == null && !quote.isLoading;
  // The compact no-reviews layout (breakdown inline, no disclosure) is only for an
  // on-track mentor with no window rating. At risk always keeps the "what's pulling
  // this down" disclosure and its guidance banner; a window rating gets the full
  // breakdown disclosure.
  const canExpand = !onTrack || rating != null;
  const isOpen = expanded && canExpand;
  const teaser = teaserOf(onTrack, currentStreak, leftWaiting, displayRate);

  const toggleLabel = isOpen
    ? 'Show less'
    : onTrack
      ? 'See your full breakdown'
      : 'See what’s pulling this down';
  const toggleVariant = isOpen ? 'text' : 'secondary-outlined';

  return (
    <section className={cx(styles.card, !onTrack && styles.cardRisk)} aria-labelledby={headingId}>
      <header className={styles.header}>
        <div className={styles.headingGroup}>
          <h2 id={headingId} ref={headingRef} tabIndex={-1} className={styles.title}>
            Session quality
          </h2>
          <span className={styles.subline}>
            How you show up for booked sessions · last 90 days
          </span>
        </div>
        <Badge type="accent" color={onTrack ? 'green' : 'red'} size="sm">
          {onTrack ? 'On track' : 'At risk'}
        </Badge>
      </header>

      <div className={styles.showUp}>
        <ProgressCircle
          value={rate}
          size="lg"
          tone={onTrack ? 'success' : 'danger'}
          aria-label="Show-up rate"
        />
        <div className={styles.showUpText}>
          <span className={styles.showUpLabel}>Show-up rate</span>
          <span className={styles.rateContext}>
            {rateContext(current, previous, onTrack, rating == null)}
          </span>
        </div>
      </div>

      <div id={panelId}>
        {isOpen ? (
          <div className={styles.expanded}>
            <Breakdown current={current} />

            <div className={styles.reviewsSection}>
              <div className={styles.reviewsHead}>
                <span className={styles.reviewsLabel}>Mentee reviews</span>
                {rating != null && (
                  <RatingGroup rating={rating} reviewCount={reviewCount} profileHref={profileHref} />
                )}
              </div>
              <ReviewSlot quoteData={quote.data} showNote={showNote} />
            </div>

            {onTrack ? (
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
                    The left-waiting copy only holds when a mentee was actually
                    waiting. mentees_left_waiting (backend #466) counts exactly
                    that — a mentor no-show with the mentee present — so it can be
                    lower than the ring's miss rate; guard the copy on it rather
                    than assert a count we can't stand behind.
                  */}
                  {leftWaiting > 0 ? (
                    <>
                      {/* The compact teaser carries the "in 90 days" qualifier;
                          the banner sits under the ring's "last 90 days" subline,
                          so it isn't repeated here (design). */}
                      <p className={styles.bannerTitle}>
                        {leftWaiting} {leftWaiting === 1 ? 'mentee was' : 'mentees were'} left waiting
                      </p>
                      <p className={styles.bannerText}>
                        Most missed sessions happen on hours you can’t really keep. Trim those hours,
                        or block the days you’ll be away.
                      </p>
                    </>
                  ) : (
                    <>
                      {/* No mentee was left waiting, but the rate itself is the
                          risk — name it, rather than a vague "slipping". */}
                      <p className={styles.bannerTitle}>Your show-up rate is {displayRate}%</p>
                      <p className={styles.bannerText}>
                        Hold your upcoming booked sessions to bring it back up.
                      </p>
                    </>
                  )}
                  <div className={styles.bannerActions}>
                    <ButtonLink href="/calendar" variant="secondary-outlined" size="small">
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
          // Collapsed. On track with no window rating shows the breakdown inline
          // (the design's no-reviews layout, no disclosure); otherwise the rating
          // line previews the review above the disclosure.
          <div className={styles.compact}>
            <Teaser teaser={teaser} />
            {!canExpand && <Breakdown current={current} />}
            {rating != null && (
              <div className={styles.ratingLine}>
                <span className={styles.ratingLineStar}>
                  <Star size={14} />
                </span>
                <strong className={styles.ratingLineValue}>{rating.toFixed(1)}</strong>
                <span>from {reviewCount}</span>
              </div>
            )}
            <ReviewSlot quoteData={quote.data} showNote={showNote} />
          </div>
        )}
      </div>

      {canExpand && (
        <Button
          variant={toggleVariant}
          size="small"
          fullWidth={!isOpen}
          icon={isOpen ? 'expand_less' : 'expand_more'}
          iconPosition="trailing"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => setExpanded((v) => !v)}
        >
          {toggleLabel}
        </Button>
      )}
    </section>
  );
}
