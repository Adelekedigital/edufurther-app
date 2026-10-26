'use client';

import { useId, useState } from 'react';
import { Chip } from '@/components/atoms/Chip/Chip';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { useSlots } from '@/lib/api/data/booking';
import { dayLabel, formatTime } from '@/lib/utils/format';
import { PickDayDialog } from './PickDayDialog';
import styles from './SlotPicker.module.css';

/** The design's own count: the two earliest, then "Pick another day". */
const CHIPS = 2;

/**
 * A slot as the chips print it — `SuggestTime.dc.html`: "Mon, Sep 28 · 10:00
 * am". Weekday, no year, and the start only. The year is noise inside a booking
 * window weeks long, and the end time is the duration they already agreed.
 *
 * Exported because a drafted message names the same instant, and the two have
 * to be the same string: a message edited by hand keeps the edit through a
 * change of slot by swapping the old label for the new one inside it, which
 * only works while the chip and the sentence agree character for character.
 */
export function slotLabel(iso: string, timeZone: string): string {
  return `${dayLabel(iso, timeZone)} · ${formatTime(iso, timeZone)}`;
}

/** What the picker says when it has no times to show. Defaults are the mentor's own calendar. */
export type SlotPickerCopy = {
  /** The read failed. */
  error: string;
  /** No answer at all (no session type, or a read that couldn't be made). */
  unknown: string;
  /** The read worked and there are no open times. */
  empty: string;
};

const MENTOR_COPY: SlotPickerCopy = {
  error: 'We couldn’t load your open times just now.',
  unknown: 'We can’t show your open times for this session right now.',
  empty: 'You have no open times for this session, so there’s nothing to offer.',
};

/** The two earliest; with a later time picked, the earliest and that one. */
export function chipsFor(all: readonly string[], value: string | null): string[] {
  const first = all.slice(0, CHIPS);
  if (!value || first.includes(value)) return first;
  return [...all.slice(0, CHIPS - 1), value];
}

type SlotPickerProps = {
  /** Whose open times: the mentor's id, whichever side is viewing. */
  mentorId: string;
  /** The session type the time is for: `/slots` is per type. */
  sessionTypeId: string | null;
  /**
   * The account zone, for the slots window. `slotWindow` turns it into day
   * strings and the contract reads those as days in the mentor's own zone, so
   * the display override would lose or gain a day at the edge.
   */
  accountZone: string;
  /** The display zone. Every time here is *read* in it. */
  timeZone: string;
  /** The chosen instant, or null. */
  value: string | null;
  onChange: (startsAt: string | null) => void;
  /** The other party's first name, for "{First} sees their own." */
  otherFirst: string;
  /** The field's label: "Suggested time" (mentor), "New time" (mentee move). */
  label: string;
  /** The no-times copy; the mentor's own by default. */
  copy?: SlotPickerCopy;
  /** Injected in tests and stories; the clock otherwise. */
  now?: Date;
};

/**
 * The time picker in the cancel dialog (SuggestTime.dc.html `picker=chips`):
 * the two earliest open times as chips, then "Pick another day", which opens a
 * month calendar of the same times.
 *
 * Every option comes from one `/slots` read for this mentor and session type,
 * which is what makes a 422 unreachable: the contract requires the instant to
 * be one `/slots` currently lists, exactly.
 *
 * Shared by the mentor's "Suggest a new time" and (PRD fix 1) the mentee's move.
 */
export function SlotPicker({
  mentorId,
  sessionTypeId,
  accountZone,
  timeZone,
  value,
  onChange,
  otherFirst,
  label,
  copy = MENTOR_COPY,
  now,
}: SlotPickerProps) {
  const [dayOpen, setDayOpen] = useState(false);
  // Not a literal: a second instance would be a duplicate-id violation.
  const labelId = useId();
  const slots = useSlots(mentorId, sessionTypeId, accountZone);

  // A slot we cannot read is not a slot we can offer: an unparseable instant
  // threw out of the formatter and took the whole Bookings screen with it.
  const all = (slots.data ?? []).filter((iso) => !Number.isNaN(new Date(iso).getTime()));

  if (slots.isLoading) {
    return (
      <div className={styles.picker}>
        <span className={styles.label}>{label}</span>
        <Skeleton height="32px" width="70%" />
      </div>
    );
  }

  // Three different things, and only one of them is "you have no open times".
  // `data === null` means we never got an answer, and saying "none" there
  // tells someone something untrue about a calendar.
  const unknown = !slots.data;
  if (slots.error || unknown || all.length === 0) {
    return (
      <div className={styles.picker}>
        <span className={styles.label}>{label}</span>
        <p className={styles.empty}>
          {slots.error ? copy.error : unknown ? copy.unknown : copy.empty}
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
    <div className={styles.picker}>
      {/* No "Optional" tag: while the offer is switched on the confirm waits
          for a time, so marking it optional and then insisting on it is the
          contradiction failure mode #62 names. */}
      <span className={styles.label} id={labelId}>
        {label}
      </span>
      <div className={styles.chips}>
        <div className={styles.chipGroup} role="radiogroup" aria-labelledby={labelId}>
          {chipsFor(all, value).map((iso) => (
            <Chip
              key={iso}
              role="radio"
              pressed={value === iso}
              // Picking the chosen one again clears it: there must be a way
              // back to offering none.
              onClick={() => onChange(value === iso ? null : iso)}
            >
              {slotLabel(iso, timeZone)}
            </Chip>
          ))}
        </div>
        {/* A month of open hours is hundreds of times, so the rest are behind a
            calendar rather than piled up as chips (failure mode #56). */}
        <button
          type="button"
          className={styles.more}
          aria-haspopup="dialog"
          onClick={() => setDayOpen(true)}
        >
          Pick another day
        </button>
      </div>
      {dayOpen && (
        <PickDayDialog
          slots={all}
          timeZone={timeZone}
          value={value}
          otherFirst={otherFirst}
          onUse={onChange}
          onClose={() => setDayOpen(false)}
          now={now}
        />
      )}
    </div>
  );
}
