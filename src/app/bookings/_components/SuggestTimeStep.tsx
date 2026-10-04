'use client';

import { useState } from 'react';
import { Chip } from '@/components/atoms/Chip/Chip';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { useSlots } from '@/lib/api/data/booking';
import { fullDate } from '@/lib/utils/bookings';
import { formatTime } from '@/lib/utils/format';
import type { Booking } from '@/types/booking';
import styles from './SuggestTimeStep.module.css';

/** The design's own count: the two earliest, then "Pick another day". */
const CHIPS = 2;

type SuggestTimeStepProps = {
  booking: Booking;
  /**
   * The viewer's own id. These are the **mentor's** open times — they are
   * offering their own availability — and on this dialog the viewer is the
   * mentor. `booking.other` is the mentee, whose slots are nobody's business.
   */
  mentorId: string;
  /** The viewer's zone. Every time here is read in it. */
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
  timeZone,
  value,
  onChange,
}: SuggestTimeStepProps) {
  const [showAll, setShowAll] = useState(false);
  const slots = useSlots(mentorId, b.sessionTypeId, timeZone);

  const all = slots.data ?? [];
  const shown = showAll ? all : all.slice(0, CHIPS);
  const label = (iso: string) => `${fullDate(iso, timeZone)} · ${formatTime(iso, timeZone)}`;

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
          {slots.error
            ? 'We couldn’t load your open times, so there’s nothing to offer here.'
            : unknown
              ? 'We can’t show your open times for this session, so there’s nothing to offer here.'
              : 'You have no open times for this session, so there’s nothing to offer.'}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.step}>
      <span className={styles.label} id="suggest-label">
        Suggested time <span className={styles.hold}>Optional</span>
      </span>
      <div className={styles.chips} role="group" aria-labelledby="suggest-label">
        {shown.map((iso) => (
          <Chip
            key={iso}
            pressed={value === iso}
            // Picking the chosen one again clears it: offering a time is
            // optional, and there must be a way back to offering none.
            onClick={() => onChange(value === iso ? null : iso)}
          >
            {label(iso)}
          </Chip>
        ))}
        {!showAll && all.length > CHIPS && (
          <button type="button" className={styles.more} onClick={() => setShowAll(true)}>
            Pick another day
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
