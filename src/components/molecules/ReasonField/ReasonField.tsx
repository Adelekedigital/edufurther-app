import { useId } from 'react';
import { Textarea } from '@/components/atoms/Input/Input';
import { ChoiceChips } from '@/components/molecules/ChoiceChips/ChoiceChips';
import { cx } from '@/lib/utils/cx';
import { reasonsFor } from '@/lib/utils/reasons';
import type { PickableReason } from '@/types/booking';
import styles from './ReasonField.module.css';

/** The 2000 the contract allows. */
export const REASON_MAX = 2000;

type ReasonFieldProps = {
  /** Which to offer: a mentee never says "I'm no longer free". */
  side: 'mentor' | 'mentee';
  reasonCode: PickableReason | null;
  onReasonCode: (value: PickableReason | null) => void;
  text: string;
  onText: (value: string) => void;
  /** Who will be told, e.g. "Amara". */
  readerFirstName: string;
  /** The reason must be given (owner, 2026-10-10). Mentors offering a time are exempt. */
  required?: boolean;
  /** Shown after a blocked submit; from `reasonError`, never composed here. */
  error?: { field: 'reason' | 'note'; message: string } | null;
  /**
   * So a caller that blocks a submit can put focus on what is wrong. An error
   * that is only announced leaves a keyboard user hunting for the control.
   */
  groupRef?: React.Ref<HTMLButtonElement>;
  noteRef?: React.Ref<HTMLTextAreaElement>;
};

/**
 * The reason on a decline, cancel or withdrawal: a coded reason, and a box for
 * the one code that needs words.
 *
 * **The chip is the whole answer.** Picking one completes the field — nothing
 * to type (owner, 2026-10-10). The chip is not what the other party reads,
 * though: it is stored as a code, and `reasonReads` turns it into a sentence
 * for them. Three strings, three jobs, all in `lib/utils/reasons.ts`.
 *
 * So the box is **hidden** unless "Something else" is picked, where the code
 * carries no meaning and the note becomes the message. An always-visible
 * optional box invited typing that duplicated the chip, and left the field
 * looking like a form when it is four buttons.
 *
 * **Required since 2026-10-10**, which the design agrees with on cancel
 * (`CancelModal.dc.html`: the confirm stays soft red until the reason is
 * given). The contract's advice that "a required one turns a clear-cut
 * decision into a form to argue with" is the outlier. Recorded as divergence
 * 42, since the coded chips themselves are ours.
 */
export function ReasonField({
  side,
  reasonCode,
  onReasonCode,
  text,
  onText,
  readerFirstName,
  required,
  error,
  groupRef,
  noteRef,
}: ReasonFieldProps) {
  const id = useId();
  const options = reasonsFor(side);
  const near = text.length > REASON_MAX - 100;
  // The box exists only for "Something else" — and is required there whenever
  // the reason itself is.
  const wantsNote = reasonCode === 'other';
  const noteRequired = !!required && wantsNote;
  const reasonBad = error?.field === 'reason';
  const noteBad = error?.field === 'note';

  return (
    <div className={styles.field}>
      {/* A visible label: `ChoiceChips` only puts it on `aria-label`, which
          leaves four unexplained chips for everyone who can see them. */}
      <span id={`${id}-reason`} className={styles.label}>
        Why? {!required && <span className={styles.optional}>Optional</span>}
      </span>
      {/* Before the chips, so a screen reader meets the problem on the way in
          rather than after choosing. */}
      {reasonBad && (
        <p id={`${id}-reason-err`} className={styles.error}>
          {error.message}
        </p>
      )}
      <ChoiceChips
        label="Reason"
        options={options}
        selected={reasonCode ? [reasonCode] : []}
        // Picking another replaces it; picking the same one clears it. No
        // `max`: at a limit of one it disables the unpicked chips and drops
        // them out of the tab order, so a wrong pick cannot be corrected.
        onToggle={(v) => onReasonCode(v === reasonCode ? null : (v as PickableReason))}
        // No `aria-invalid`: these are buttons in a `role="group"`, where it
        // means nothing to a screen reader. The error is associated by
        // `aria-describedby`, sits before the chips in the DOM, and the dialog
        // moves focus to the first chip when it blocks a submit.
        describedBy={reasonBad ? `${id}-reason ${id}-reason-err` : `${id}-reason`}
        firstRef={groupRef}
      />
      {/* One hint, always in the same place, so nothing shifts when the box
          appears. It has to say the truth of whichever path they are on: a
          picked chip reaches them as our sentence, and "Something else"
          reaches them as their own words. */}
      <p id={`${id}-hint`} className={styles.hint}>
        {wantsNote
          ? `${readerFirstName} will read what you write.`
          : `${readerFirstName} will be told why.`}
      </p>
      {wantsNote && (
        <>
          <label htmlFor={`${id}-note`} className={styles.label}>
            What happened? {!noteRequired && <span className={styles.optional}>Optional</span>}
          </label>
          {noteBad && (
            <p id={`${id}-note-err`} className={styles.error}>
              {error.message}
            </p>
          )}
          <Textarea
            id={`${id}-note`}
            value={text}
            onChange={(e) => onText(e.target.value)}
            maxLength={REASON_MAX}
            rows={4}
            required={noteRequired || undefined}
            // The atom's own prop, not a raw `aria-invalid`: it applies that
            // after spreading the rest, so an attribute passed here would be
            // dropped.
            ref={noteRef}
            invalid={noteBad}
            aria-describedby={noteBad ? `${id}-hint ${id}-note-err` : `${id}-hint`}
            className={styles.text}
          />
          {/* Only once it is worth knowing: a counter from zero is noise. */}
          {text.length > 0 && (
            <span className={cx(styles.count, near && styles.countNear)}>
              {text.length} / {REASON_MAX}
            </span>
          )}
        </>
      )}
    </div>
  );
}
