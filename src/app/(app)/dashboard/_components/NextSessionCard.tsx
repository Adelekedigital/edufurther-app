/* eslint-disable @next/next/no-img-element -- static decorative SVG; next/image adds nothing for vector art */
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { DateChip } from '@/components/molecules/DateChip/DateChip';
import { DashboardNextSession } from '@/components/organisms/DashboardNextSession/DashboardNextSession';
import { daysBetween, timeRange } from '@/lib/utils/bookings';
import type { Booking } from '@/types/booking';
import type { AppError } from '@/types/mentor';
import { cx } from '@/lib/utils/cx';
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
  /**
   * `hero`: the card drawn inside the new-mentor hero (firstBooked), a band of
   * the hero with the session in an outlined row. Default: its own card.
   */
  variant?: 'card' | 'hero';
  /** Added after the "In 6 days" line, e.g. "Your first booking". */
  note?: string;
};

const inZone = (iso: string, timeZone: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-US', { ...opts, timeZone }).format(new Date(iso));

function SessionRow({
  booking,
  timeZone,
  now,
  note,
  hero,
}: {
  booking: Booking;
  timeZone: string;
  now: Date;
  note?: string;
  hero: boolean;
}) {
  const days = daysBetween(now, new Date(booking.startsAt), timeZone);
  const rel = days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`;
  // Join is never greyed out or swapped (owner, 26 Oct): the session's own page
  // shows the countdown, lobby or outcome for every phase.
  const sessionHref = `/sessions/${encodeURIComponent(booking.id)}`;
  return (
    <div className={cx(styles.body, hero && styles.heroRow)}>
      <DateChip iso={booking.startsAt} timeZone={timeZone} />
      <div className={cx(styles.details, hero && styles.heroDetails)}>
        <span className={styles.sessionTitle}>{booking.title ?? 'Session'}</span>
        <span className={styles.meta}>
          with <strong className={styles.who}>{booking.other.name}</strong> ·{' '}
          {inZone(booking.startsAt, timeZone, { weekday: 'short' })}, {timeRange(booking, timeZone)}
        </span>
        <span className={styles.sub}>{note ? `${rel} · ${note}` : rel}</span>
      </div>
      <div className={cx(styles.actions, hero && styles.heroActions)}>
        <ButtonLink href={sessionHref} variant="primary" size="medium">
          Join session
        </ButtonLink>
      </div>
    </div>
  );
}

/**
 * Mentor Dashboard v2 "Next session" card, in the shared DashboardNextSession
 * frame (one with the mentee's, #417). Renders all four states; error is
 * checked before empty, so a failed load never reads as "no sessions". The
 * soonest confirmed session the mentor hosts is the hero row.
 *
 * Omitted from the design pending backend: the venue line (no per-row venue),
 * the "New mentee" tag (no first-time-with-you signal), and "Send a message"
 * (no endpoint — #334). The CTA is always "Join session", to the session page.
 */
export function NextSessionCard({
  isLoading,
  error,
  onRetry,
  booking,
  timeZone,
  now,
  variant = 'card',
  note,
}: NextSessionCardProps) {
  const hero = variant === 'hero';
  return (
    <DashboardNextSession variant={variant}>
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
        <SessionRow booking={booking} timeZone={timeZone} now={now} note={note} hero={hero} />
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
          <ButtonLink href="/calendar" variant="primary" size="medium">
            Update availability
          </ButtonLink>
        </div>
      )}
    </DashboardNextSession>
  );
}
