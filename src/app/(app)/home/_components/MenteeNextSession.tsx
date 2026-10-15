'use client';

import { useId, useState } from 'react';
import { ButtonLink } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { cx } from '@/lib/utils/cx';
import { joinState, nextSessionWhen, timeRange } from '@/lib/utils/bookings';
import type { Booking } from '@/types/booking';
import { MenteeTipsModal } from './MenteeTipsModal';
import styles from './MenteeNextSession.module.css';

type MenteeNextSessionProps = {
  /** The soonest upcoming session — upcomingBookings[0]. */
  booking: Booking;
  /** The viewer's zone: all times and the date chip read in it. */
  timeZone: string;
  now?: Date;
};

const HOUR = 60 * 60_000;

/** The three client-only prep prompts (Mentee Dashboard v2.dc.html prep list). */
const PREP = [
  'Re-read what you shared when booking',
  'Write down the two questions that matter most',
  'Test your camera and microphone',
] as const;

function monthDay(iso: string, timeZone: string): { month: string; day: string } {
  const d = new Date(iso);
  return {
    month: new Intl.DateTimeFormat('en-US', { month: 'short', timeZone }).format(d),
    day: new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone }).format(d),
  };
}

function weekday(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone }).format(new Date(iso));
}

/** The full date for assistive tech — the visible chip is decorative, and the
 *  time line alone can't say which day a session weeks away falls on. */
function fullDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone,
  }).format(new Date(iso));
}

/**
 * The mentee's next session on the home screen (Mentee Dashboard v2.dc.html
 * "Next session"): a date chip, who and when, a client-only prep checklist, and
 * one action — Join when it is nearly time, View details otherwise.
 *
 * Its own card rather than the Bookings hero (NextSessionCard): the design adds
 * the date chip and the prep list the Bookings hero does not have. It takes the
 * same Booking and reuses the same join/time helpers, so the two never disagree.
 * "Send a message" is omitted until Messages ships (a dead control teaches people
 * the page is broken); the meeting provider is omitted because the upcoming
 * payload does not carry it (both tracked in design-divergence.md).
 */
export function MenteeNextSession({ booking: b, timeZone, now = new Date() }: MenteeNextSessionProps) {
  const prepId = useId();
  const [prepOpen, setPrepOpen] = useState(false);
  const [done, setDone] = useState<boolean[]>(() => PREP.map(() => false));
  const [tipsOpen, setTipsOpen] = useState(false);

  const { month, day } = monthDay(b.startsAt, timeZone);
  const when = nextSessionWhen(b, now, timeZone);
  const join = joinState(b, now);
  const joinable = join === 'open';
  // Within the hour or already started: show the live badge and route to Join
  // (the session page hosts the lobby before the door opens). But a *closed*
  // join window means the session is over, even while the backend still lists it
  // as confirmed (useUpcomingBookings keeps just-settled rows) — a Join that can
  // only fail is worse than none (as NextSessionCard), so a closed window drops
  // back to "View details".
  const soon =
    join !== 'closed' &&
    (joinable || when.live || new Date(b.startsAt).getTime() - now.getTime() <= HOUR);
  const doneCount = done.filter(Boolean).length;

  return (
    <section aria-label="Next session" className={styles.card}>
      <div className={styles.head}>
        <h2 className={styles.title}>Next session</h2>
        <div className={styles.headActions}>
          <button type="button" className={styles.tips} onClick={() => setTipsOpen(true)}>
            <Icon name="lightbulb" size={16} className={styles.tipsIcon} />
            Tips
          </button>
          <ButtonLink href="/bookings" prefetch={false} variant="text" size="small">
            All bookings
          </ButtonLink>
        </div>
      </div>

      <div className={styles.body}>
        {soon && (
          <span className={styles.soon}>
            <span aria-hidden="true" className={styles.soonDot} />
            {when.label}
          </span>
        )}

        {/* Info and action side by side on desktop (design nextActions=beside),
            stacked on a phone. */}
        <div className={styles.main}>
          <div className={styles.when}>
            <span aria-hidden="true" className={styles.date}>
              <span className={styles.dateMonth}>{month}</span>
              <span className={styles.dateDay}>{day}</span>
            </span>
            <div className={styles.detail}>
              <span className="sr-only">{fullDate(b.startsAt, timeZone)}</span>
              <span className={styles.sessionTitle}>{b.title ?? 'Session'}</span>
              <span className={styles.with}>
                with <strong className={styles.name}>{b.other.name}</strong>
              </span>
              <span className={styles.time}>
                {weekday(b.startsAt, timeZone)}, {timeRange(b, timeZone)}
              </span>
            </div>
          </div>

          <div className={styles.actions}>
            {soon ? (
              <ButtonLink
                href={`/sessions/${encodeURIComponent(b.id)}`}
                prefetch={false}
                variant="primary"
                size="medium"
              >
                Join session
              </ButtonLink>
            ) : (
              <ButtonLink
                href={`/bookings?booking=${encodeURIComponent(b.id)}`}
                prefetch={false}
                variant="secondary-outlined"
                size="medium"
              >
                View details
              </ButtonLink>
            )}
          </div>
        </div>

        <div className={styles.prep}>
          <button
            type="button"
            className={styles.prepToggle}
            aria-expanded={prepOpen}
            aria-controls={prepId}
            onClick={() => setPrepOpen((v) => !v)}
          >
            <span className={styles.prepLabel}>
              <Icon name="checklist" size={18} className={styles.prepIcon} />
              Before your session · {doneCount} of {PREP.length}
            </span>
            <Icon
              name="expand_more"
              size={20}
              className={cx(styles.prepChevron, prepOpen && styles.prepChevronOpen)}
            />
          </button>
          {prepOpen && (
            <ul id={prepId} className={styles.prepList}>
              {PREP.map((label, i) => (
                <li key={label}>
                  <button
                    type="button"
                    className={cx(styles.prepItem, done[i] && styles.prepItemDone)}
                    aria-pressed={done[i]}
                    onClick={() =>
                      setDone((prev) => prev.map((v, j) => (j === i ? !v : v)))
                    }
                  >
                    <Icon
                      name={done[i] ? 'check_circle' : 'radio_button_unchecked'}
                      size={20}
                      className={styles.prepItemIcon}
                    />
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {tipsOpen && <MenteeTipsModal onClose={() => setTipsOpen(false)} />}
    </section>
  );
}
