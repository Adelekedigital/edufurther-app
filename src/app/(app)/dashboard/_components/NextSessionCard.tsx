/* eslint-disable @next/next/no-img-element -- static decorative SVG; next/image adds nothing for vector art */
import Link from 'next/link';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { daysBetween, joinState, timeRange } from '@/lib/utils/bookings';
import type { Booking } from '@/types/booking';
import type { AppError } from '@/types/mentor';
import styles from './NextSessionCard.module.css';

type NextSessionCardProps = {
  isLoading: boolean;
  error: AppError | null;
  onRetry: () => void;
  /** The soonest confirmed session the mentor hosts, or null when there is none. */
  booking: Booking | null;
  /** The viewer's display zone. */
  timeZone: string;
  now: Date;
};

const inZone = (iso: string, timeZone: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-US', { ...opts, timeZone }).format(new Date(iso));

function SessionRow({
  booking,
  timeZone,
  now,
}: {
  booking: Booking;
  timeZone: string;
  now: Date;
}) {
  const days = daysBetween(now, new Date(booking.startsAt), timeZone);
  const rel = days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`;
  // The session's own page is both the way in and, outside the join window, the
  // countdown, details or outcome — so one href serves either CTA.
  const sessionHref = `/sessions/${encodeURIComponent(booking.id)}`;
  // Join only while the window is open: outside it, a Join that can only fail
  // is worse than none. Every other moment (ahead of the window, running past
  // it, just ended) still links to the session page (#255).
  const canJoin = joinState(booking, now) === 'open';
  return (
    <div className={styles.body}>
      <div className={styles.chip} aria-hidden>
        <span className={styles.chipMonth}>{inZone(booking.startsAt, timeZone, { month: 'short' })}</span>
        <span className={styles.chipDay}>{inZone(booking.startsAt, timeZone, { day: 'numeric' })}</span>
      </div>
      <div className={styles.details}>
        <span className={styles.sessionTitle}>{booking.title ?? 'Session'}</span>
        <span className={styles.meta}>
          with <strong className={styles.who}>{booking.other.name}</strong> ·{' '}
          {inZone(booking.startsAt, timeZone, { weekday: 'short' })}, {timeRange(booking, timeZone)}
        </span>
        <span className={styles.sub}>{rel}</span>
      </div>
      <div className={styles.actions}>
        {canJoin ? (
          <ButtonLink href={sessionHref} variant="primary" size="small">
            Join session
          </ButtonLink>
        ) : (
          <ButtonLink href={sessionHref} variant="secondary-outlined" size="small">
            View session details
          </ButtonLink>
        )}
      </div>
    </div>
  );
}

/**
 * Mentor Dashboard v2 "Next session" card. Renders all four states; error is
 * checked before empty, so a failed load never reads as "no sessions". The
 * soonest confirmed session the mentor hosts is the hero row.
 *
 * Omitted from the design pending backend: the venue line (no per-row venue),
 * the "New mentee" tag (no first-time-with-you signal), and "Send a message"
 * (no endpoint — #334). The CTA is time-aware: "Join session" inside the join
 * window, and "View session details" at every other moment (#255).
 */
export function NextSessionCard({
  isLoading,
  error,
  onRetry,
  booking,
  timeZone,
  now,
}: NextSessionCardProps) {
  return (
    <section className={styles.card} aria-label="Next session">
      <div className={styles.head}>
        <h2 className={styles.title}>Next session</h2>
        <Link href="/bookings" className={styles.allLink}>
          All bookings
        </Link>
      </div>
      {isLoading ? (
        <div className={styles.body} aria-busy>
          <span className="sr-only">Loading your next session</span>
          <Skeleton width="56px" height="56px" radius="lg" />
          <div className={styles.lines}>
            <Skeleton width="55%" height="16px" />
            <Skeleton width="80%" height="12px" />
          </div>
        </div>
      ) : error ? (
        <div className={styles.state} role="alert">
          <p className={styles.stateText}>We couldn’t load your next session.</p>
          <Button variant="secondary-outlined" size="small" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : booking ? (
        <SessionRow booking={booking} timeZone={timeZone} now={now} />
      ) : (
        <div className={styles.body}>
          <div className={styles.empty}>
            <img
              src="/illustrations/calendar.svg"
              alt=""
              width={56}
              height={56}
              className={styles.illus}
            />
            <div className={styles.lines}>
              <span className={styles.sessionTitle}>No upcoming sessions</span>
              <span className={styles.meta}>
                Mentees book from your open hours. Check they’re up to date for the next few weeks.
              </span>
            </div>
          </div>
          <ButtonLink href="/calendar" variant="primary" size="small">
            Update availability
          </ButtonLink>
        </div>
      )}
    </section>
  );
}
