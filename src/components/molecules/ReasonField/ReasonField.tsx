import { useId } from 'react';
import { Textarea } from '@/components/atoms/Input/Input';
import { ChoiceChips } from '@/components/molecules/ChoiceChips/ChoiceChips';
import { cx } from '@/lib/utils/cx';
import type { PickableReason } from '@/lib/api/data/bookingActions';
import styles from './ReasonField.module.css';

/** The 2000 the contract allows. */
export const REASON_MAX = 2000;

/** Only the four a person would choose; the rest of the enum is system-set. */
const REASONS: { value: PickableReason; label: string }[] = [
  { value: 'scheduling_conflict', label: 'A clash in my calendar' },
  { value: 'mentor_unavailable', label: 'I’m no longer free' },
  { value: 'mentee_no_longer_needed', label: 'I no longer need it' },
  { value: 'technical_issue', label: 'Something technical' },
];

type ReasonFieldProps = {
  /** Which of the four to offer: a mentee never says "I'm no longer free". */
  side: 'mentor' | 'mentee';
  reasonCode: PickableReason | null;
  onReasonCode: (value: PickableReason | null) => void;
  text: string;
  onText: (value: string) => void;
  /** Who will read it, e.g. "Amara". */
  readerFirstName: string;
};

/**
 * The reason on a decline, cancel or withdrawal — a coded one and a note, both
 * optional.
 *
 * Optional is the point, and the contract says why: "a required one turns a
 * clear-cut decision into a form to argue with". So there is no asterisk, no
 * blocked submit, and the hint says plainly that it can be skipped.
 */
export function ReasonField({
  side,
  reasonCode,
  onReasonCode,
  text,
  onText,
  readerFirstName,
}: ReasonFieldProps) {
  const id = useId();
  const options = REASONS.filter((r) =>
    side === 'mentor' ? r.value !== 'mentee_no_longer_needed' : r.value !== 'mentor_unavailable',
  );
  const near = text.length > REASON_MAX - 100;

  return (
    <div className={styles.field}>
      <ChoiceChips
        label="Reason"
        options={options}
        selected={reasonCode ? [reasonCode] : []}
        // One at a time: picking another replaces it, picking the same clears it.
        onToggle={(v) => onReasonCode(v === reasonCode ? null : (v as PickableReason))}
        max={1}
        describedBy={`${id}-hint`}
      />
      <p id={`${id}-hint`} className={styles.hint}>
        Optional. Anything you write here, {readerFirstName} will read.
      </p>
      <Textarea
        value={text}
        onChange={(e) => onText(e.target.value)}
        maxLength={REASON_MAX}
        rows={4}
        aria-label="Add a note"
        aria-describedby={`${id}-hint`}
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
