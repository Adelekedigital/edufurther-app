'use client';

import { Icon } from '@/components/atoms/Icon/Icon';
import { Textarea } from '@/components/atoms/Input/Input';
import type { Booking } from '@/types/booking';
import { SlotPicker } from './SlotPicker';
import styles from './SuggestTimeStep.module.css';

/**
 * How long an offered time is kept for the mentee alone, said out loud.
 *
 * **Not on the contract.** `SuggestionRead.held_until` carries the instant once
 * a suggestion exists, but nothing gives the duration *before* one is made, so
 * this number is ours and will go stale the day the backend's policy changes.
 * That is the whole reason it is a named constant rather than a word inside a
 * sentence: it greps, and it is one place to change. Divergence row 36 spelled
 * it "two" for the same worry, which never helped — the number was just as
 * hardcoded and harder to find. Superseded 2026-10-13.
 *
 * If a `hold_hours` ever appears on the contract, read it and delete this.
 */
export const HOLD_HOURS = 2;

/**
 * `SuggestTime.dc.html`'s cap on the message. The contract's `reason_text`
 * allows 2000, so this is the design's limit and not the server's — a note
 * going with an offered time is a sentence or two, and the draft below leaves
 * most of the room free to rewrite.
 */
const MESSAGE_MAX = 500;

/**
 * The message that goes with the offer, drafted as `SuggestTime.dc.html` drafts
 * it: the mentor's words to send or write over, never ours to send silently.
 *
 * It carries the one thing the offered time cannot say by itself — *why* the
 * agreed hour is going away. Until 2026-10-13 a mentee received a suggested
 * time with no message whatsoever: open question 2 of
 * `docs/handoff/bookings-design-request.md` asked design and the owner whether
 * to pre-fill the single `reason_text` the contract has, and the answer was yes.
 */
export function suggestDraft({
  first,
  mode,
  origDay,
  slot,
}: {
  first: string;
  /** A cancel names the day it is calling off; a decline has no agreed day. */
  mode: 'cancel' | 'decline';
  origDay: string;
  slot: string;
}): string {
  const lead =
    mode === 'cancel'
      ? `I’m sorry, I have to cancel our session on ${origDay}.`
      : 'I can’t make the time you asked for.';
  return (
    `Hi ${first}, ${lead} ${offerSentence(slot)} I’ve held it for you for ` +
    `${HOLD_HOURS} hours. If it doesn’t suit you, pick any other open time on my profile.`
  );
}

/**
 * The one sentence in the draft that names the offered time, built here so the
 * draft and the swap below cannot drift apart. Changing the wording in
 * `suggestDraft` without changing it here would stop the swap finding it.
 */
export function offerSentence(slot: string): string {
  return `Could we do ${slot} instead?`;
}

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
  /**
   * The message going with the offer. Controlled like `value`, and for the same
   * reason: the dialog builds the payload, so it has to be the one deciding
   * what survives a change of slot and what is sent. This step renders the box.
   */
  message: string;
  onMessage: (value: string) => void;
  /** Injected in tests and stories; the clock otherwise. */
  now?: Date;
};

/**
 * Offering another time while declining or cancelling (SuggestTime.dc.html).
 *
 * Every option comes from the mentor's **real** open slots for this offering,
 * which is what makes a 422 unreachable: the contract requires the suggested
 * instant to be one `/slots` currently lists, exactly.
 *
 * The picker (chips, then "Pick another day") is `SlotPicker`, shared with the
 * mentee's move; this step adds the hold line and the message.
 */
export function SuggestTimeStep({
  booking: b,
  mentorId,
  accountZone,
  timeZone,
  value,
  onChange,
  message,
  onMessage,
  now,
}: SuggestTimeStepProps) {
  return (
    <div className={styles.step}>
      <SlotPicker
        mentorId={mentorId}
        sessionTypeId={b.sessionTypeId}
        accountZone={accountZone}
        timeZone={timeZone}
        value={value}
        onChange={onChange}
        otherFirst={b.other.firstName}
        label="Suggested time"
        now={now}
      />
      {value && (
        <>
          <span className={styles.hold}>
            <Icon name="lock_clock" size={14} className={styles.holdIcon} />
            Held for {b.other.firstName} for {HOLD_HOURS} hours, then it opens to others again.
          </span>
          {/* Last in the step, where the design puts it — and behind the same
              condition as the hold line above it. A message whose whole point
              is "could we do this instead?" has no instead to name until a time
              is picked, and the confirm is blocked without one anyway.

              The label wraps the box, as the design's markup has it, so the
              name comes from the text beside it and there is no id to keep in
              step. No "Optional" tag and nothing `required`: a cleared box
              sends nothing and the offered time still carries the meaning
              (owner, 2026-10-13). */}
          <label className={styles.message}>
            Message to {b.other.firstName}
            <Textarea
              value={message}
              onChange={(e) => onMessage(e.target.value)}
              maxLength={MESSAGE_MAX}
              className={styles.messageBox}
            />
          </label>
        </>
      )}
    </div>
  );
}
