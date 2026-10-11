import { useId } from 'react';
import { Textarea } from '@/components/atoms/Input/Input';
import { ChoiceChips } from '@/components/molecules/ChoiceChips/ChoiceChips';
import { cx } from '@/lib/utils/cx';
import type { PickableReason } from '@/types/booking';
import styles from './ReasonField.module.css';

/** The 2000 the contract allows. */
export const REASON_MAX = 2000;

/**
 * The ones a person would choose; the rest of the enum is system-set.
 *
 * One list, filtered by **side only** — the action does not change it, so a
 * mentee cancelling and a mentee withdrawing are offered the same reasons
 * (owner, 2026-10-10; and the server agrees). `other` is last, which the
 * backend asked for, and is the only entry both roles may send.
 *
 * PROVISIONAL LABELS. Ours, not the design's: `CancelModal.dc.html` is not in
 * the mirror yet, so these are the wording already shipped plus one. Replaced
 * in the fidelity pass.
 */
const REASONS: { value: PickableReason; label: string }[] = [
  { value: 'scheduling_conflict', label: 'A clash in my calendar' },
  { value: 'mentor_unavailable', label: 'I’m no longer free' },
  { value: 'mentee_no_longer_needed', label: 'I no longer need it' },
  { value: 'technical_issue', label: 'Something technical' },
  { value: 'other', label: 'Something else' },
];

/** The reasons this side may send. A code outside its list is a 422. */
export function reasonsFor(side: 'mentor' | 'mentee') {
  return REASONS.filter((r) =>
    side === 'mentor' ? r.value !== 'mentee_no_longer_needed' : r.value !== 'mentor_unavailable',
  );
}

/**
 * Why this submit cannot go through, or null when it can. **One definition**,
 * exported, so the field, the dialog and the tests cannot drift into three
 * slightly different rules.
 *
 * `suggesting` is a mentor offering another time instead, which stands in for
 * the explanation — the only exemption (owner, 2026-10-10).
 */
export function reasonError(
  { reasonCode, text, required, suggesting }: {
    reasonCode: PickableReason | null;
    text: string;
    required?: boolean;
    suggesting?: boolean;
  },
): { field: 'reason' | 'note'; message: string } | null {
  if (!required || suggesting) return null;
  // Not "so they know what happened": the coded reason is **not** shown to the
  // other party — `sessionEvents` maps `reason_text` only, dropping
  // `reason_code`, which the API does send. Promising a reader it does not
  // have would be a lie in the one place someone is already frustrated.
  if (!reasonCode) return { field: 'reason', message: 'Pick a reason before you go on.' };
  // "Something else" on its own records that none of the options fit and
  // nothing about what did, and the other party reads a bare "Other".
  // Non-empty after trimming, with no length floor: a floor invites "asdf" and
  // punishes someone typing a true short answer like "visa refused".
  if (reasonCode === 'other' && !text.trim())
    return { field: 'note', message: 'Say briefly what happened.' };
  return null;
}

type ReasonFieldProps = {
  /** Which of the four to offer: a mentee never says "I'm no longer free". */
  side: 'mentor' | 'mentee';
  reasonCode: PickableReason | null;
  onReasonCode: (value: PickableReason | null) => void;
  text: string;
  onText: (value: string) => void;
  /** Who will read it, e.g. "Amara". */
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
 * The reason on a decline, cancel or withdrawal — a coded one and a note.
 *
 * **Required since 2026-10-10**, by the owner's decision, which overrode the
 * contract's advice that "a required one turns a clear-cut decision into a
 * form to argue with". The reason given was that it is a data point, and that
 * the other party reading a bare "Other" is worse than the friction. Recorded
 * as a divergence.
 *
 * The note stays optional *except* alongside "Something else", where the coded
 * reason carries no meaning without it.
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
  // The note is required only alongside "Something else".
  const noteRequired = !!required && reasonCode === 'other';
  const reasonBad = error?.field === 'reason';
  const noteBad = error?.field === 'note';

  return (
    <div className={styles.field}>
      {/* A visible label: `ChoiceChips` only puts it on `aria-label`, which
          leaves three unexplained chips for everyone who can see them. */}
      <span id={`${id}-reason`} className={styles.label}>
        Why?{' '}
        {!required && <span className={styles.optional}>Optional</span>}
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
      <label htmlFor={`${id}-note`} className={styles.label}>
        {noteRequired ? 'What happened?' : 'Add a note'}{' '}
        {!noteRequired && <span className={styles.optional}>Optional</span>}
      </label>
      <p id={`${id}-hint`} className={styles.hint}>
        {readerFirstName} will read this.
      </p>
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
        // The atom's own prop, not a raw `aria-invalid`: it applies that after
        // spreading the rest, so an attribute passed here would be dropped.
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
    </div>
  );
}
