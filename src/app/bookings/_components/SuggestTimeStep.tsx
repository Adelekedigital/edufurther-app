'use client';

import { useId, useState } from 'react';
import { Chip } from '@/components/atoms/Chip/Chip';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { useSlots } from '@/lib/api/data/booking';
import { fullDate } from '@/lib/utils/bookings';
import { formatTime } from '@/lib/utils/format';
import type { Booking } from '@/types/booking';
import styles from './SuggestTimeStep.module.css';

/** The design's own count: the two earliest, then a way to more. */
const CHIPS = 2;
/** How many more each press reveals. A month of hourly slots is hundreds. */
const MORE = 8;

type SuggestTimeStepProps = {
  booking: Booking;
  /**
   * The viewer's own id. These are the **mentor's** open times — they are
   * offering their own availability — and on this dialog the viewer is the
   * mentor. `booking.other` is the mentee, whose slots are nobody's business.
   */
  mentorId: string;
  /**
   * The account zone, for the slots window. `slotWindow` turns it into day
   * strings and the contract reads those as days in the mentor's own zone, so
   * the display override would lose or gain a day at the edge.
   */
  accountZone: string;
  /** The display zone. Every time here is *read* in it. */
  timeZone: string;
  /** The chosen instant, or null for "no, just decline". */
  value: string | null;
  onChange: (startsAt: string | null) => void;
};

/**
 * Offering another time while declining or cancelling (SuggestTime.dc.html).
 *
 * Every option comes from the mentor's **real** open slots for this offering,
 * which is what makes a 422 unreachable: the contract requires the suggested
 * instant to be one `/slots` currently lists, exactly.
 *
 * The design's "Pick another day" month picker is not built here — see the
 * divergence note. The chips cover the common case, and a month picker that
 * cannot be driven by the slots we already hold would be a second source of
 * truth for availability.
 */
export function SuggestTimeStep({
  booking: b,
  mentorId,
  accountZone,
  timeZone,
  value,
  onChange,
}: SuggestTimeStepProps) {
  const [limit, setLimit] = useState(CHIPS);
  // Not a literal: a second instance would be a duplicate-id violation.
  const labelId = useId();
  const slots = useSlots(mentorId, b.sessionTypeId, accountZone);

  // A slot we cannot read is not a slot we can offer: an unparseable instant
  // threw out of `fullDate` and took the whole Bookings screen with it.
  const all = (slots.data ?? []).filter((iso) => !Number.isNaN(new Date(iso).getTime()));
  const shown = all.slice(0, limit);
  const label = (iso: string) =>
    `${fullDate(iso, timeZone)} · ${formatTime(iso, timeZone)} to ${formatTime(
      new Date(new Date(iso).getTime() + b.durationMin * 60_000).toISOString(),
      timeZone,
    )}`;

  if (slots.isLoading) {
    return (
      <div className={styles.step}>
        <span className={styles.label}>Suggested time</span>
        <Skeleton height="32px" width="70%" />
      </div>
    );
  }

  // Three different things, and only one of them is "you have no open times".
  // `data === null` means we never got an answer — a booking with no offering
  // recorded, or a read that could not be made — and saying "you have none"
  // there tells a mentor something untrue about their own calendar.
  const unknown = !slots.data;
  if (slots.error || unknown || all.length === 0) {
    return (
      <div className={styles.step}>
        <span className={styles.label}>Suggested time</span>
        <p className={styles.empty}>
          {/* Only the last of these can conclude anything. If we cannot read the
              times we cannot know whether there are any, and telling a mentor
              with a full calendar that there is "nothing to offer" is a claim
              about their own availability we have no basis for. */}
          {slots.error
            ? 'We couldn’t load your open times just now.'
            : unknown
              ? 'We can’t show your open times for this session right now.'
              : 'You have no open times for this session, so there’s nothing to offer.'}
        </p>
        {(slots.error || unknown) && (
          <button type="button" className={styles.more} onClick={slots.retry}>
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.step}>
      <span className={styles.label} id={labelId}>
        Suggested time <span className={styles.optional}>Optional</span>
      </span>
      <div className={styles.chips} role="radiogroup" aria-labelledby={labelId}>
        {shown.map((iso) => (
          <Chip
            key={iso}
            role="radio"
            pressed={value === iso}
            // Picking the chosen one again clears it: offering a time is
            // optional, and there must be a way back to offering none.
            onClick={() => onChange(value === iso ? null : iso)}
          >
            {label(iso)}
          </Chip>
        ))}
        {/* Eight at a time, not everything: a month of open hours is hundreds
            of chips, and one press used to push the dialog's own buttons about
            900px below the fold on a phone. The label says what it does — it
            reveals more times, it does not pick a day. */}
        {all.length > limit && (
          <button
            type="button"
            className={styles.more}
            onClick={() => setLimit((n) => n + MORE)}
          >
            Show more times
          </button>
        )}
      </div>
      {value && (
        <span className={styles.hold}>
          <Icon name="lock_clock" size={14} />
          Held for {b.other.firstName} for two hours, then it opens to others again.
        </span>
      )}
    </div>
  );
}
