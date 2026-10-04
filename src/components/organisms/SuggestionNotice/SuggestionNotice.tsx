'use client';

import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import {
  SuggestionCountdown,
  isHoldLapsed,
} from '@/components/molecules/SuggestionCountdown/SuggestionCountdown';
import { fullDate } from '@/lib/utils/bookings';
import { cx } from '@/lib/utils/cx';
import { formatTime } from '@/lib/utils/format';
import type { BookingSuggestion } from '@/types/suggestion';
import styles from './SuggestionNotice.module.css';

type SuggestionNoticeProps = {
  suggestion: BookingSuggestion;
  /** The other party's first name — the mentor who offered the time. */
  firstName: string;
  /** The viewer's zone. The offered time is read in it, never the stored one. */
  timeZone: string;
  /** Opens the booking flow on the offered time. Only the live state uses it. */
  onBook: () => void;
  /**
   * The screen's clock, as `BookingRow` and `NextSessionCard` take it. Pass the
   * ticking one: it is what flips the whole notice to lapsed, not just the
   * pill. Left out, the pill keeps its own clock and the rest is read once.
   */
  now?: Date;
};

/** Which of the three things to say. There is no fourth: no offer, no notice. */
type State = 'active' | 'booked' | 'expired';

const ICON: Record<State, IconName> = {
  active: 'event_repeat',
  booked: 'event_available',
  expired: 'event_busy',
};

const EYEBROW: Record<State, string> = {
  active: 'New time offered',
  booked: 'Time booked',
  expired: 'Offer lapsed',
};

/**
 * The mentee's view of another time their mentor offered when declining or
 * cancelling a booking (`SessionRead.suggestion`, backend #339).
 *
 * Presentational: it says what the offer *is*, never acts on it. Booking the
 * time goes through the ordinary booking flow, which is why `onBook` is a plain
 * callback — the held slot appears in that mentor's `/slots` for this mentee and
 * nobody else, so there is no second endpoint to call.
 *
 * **The design has no mentee-side view of an offered time at all**: its
 * `SuggestTime` component is the mentor's panel for making the offer. Every
 * word and value here is ours, recorded in `design-divergence.md`.
 */
export function SuggestionNotice({
  suggestion: s,
  firstName,
  timeZone,
  onBook,
  now,
}: SuggestionNoticeProps) {
  const at = now ?? new Date();
  // A row fetched while the hold was alive keeps saying `active` after it runs
  // out, because the backend computes the status on every read. The clock
  // settles what to show; the next read settles what it is.
  const lapsed = s.status === 'expired' || isHoldLapsed(s.heldUntil, at);
  const state: State = s.status === 'booked' ? 'booked' : lapsed ? 'expired' : 'active';
  const when = `${fullDate(s.startsAt, timeZone)} · ${formatTime(s.startsAt, timeZone)} to ${formatTime(
    s.endsAt,
    timeZone,
  )}`;

  return (
    <section aria-label="Suggested time" className={cx(styles.card, styles[state])}>
      <span className={styles.eyebrow}>
        <Icon name={ICON[state]} size={14} />
        {EYEBROW[state]}
      </span>

      <span className={styles.heading}>
        {state === 'active' && `${firstName} offered another time`}
        {state === 'booked' && `You booked the time ${firstName} offered`}
        {state === 'expired' && `The time ${firstName} offered is no longer held`}
      </span>

      <span className={styles.when}>
        <Icon name="schedule" size={14} />
        {when}
      </span>

      <p className={styles.body}>
        {state === 'active' &&
          'This time is held for you alone — nobody else can book it until the hold runs out.'}
        {state === 'booked' && 'It is in your bookings now.'}
        {/* An expired hold does not mean the time is gone, only that it is no
            longer kept for this mentee (backend: re-read /slots). Promising it
            either way would be a guess. */}
        {state === 'expired' &&
          'It is open to anyone again, so it may still be free or someone else may have taken it.'}
      </p>

      {state === 'active' && (
        <div className={styles.actions}>
          {/* The raw prop, not `at`: with no clock from the screen the pill
              keeps its own and still counts down. */}
          <SuggestionCountdown heldUntil={s.heldUntil} now={now} />
          {/* The whole name in `aria-label`: "Book this time" alone says
              nothing when the page holds more than one offer (failure log #51). */}
          <Button variant="primary" size="medium" onClick={onBook} aria-label={`Book ${when}`}>
            Book this time
          </Button>
        </div>
      )}
    </section>
  );
}
