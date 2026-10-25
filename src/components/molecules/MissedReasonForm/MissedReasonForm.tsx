import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { CharCount } from '@/components/atoms/CharCount/CharCount';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Textarea } from '@/components/atoms/Input/Input';
import { ChoiceChips } from '@/components/molecules/ChoiceChips/ChoiceChips';
import styles from './MissedReasonForm.module.css';

export type MissedReasonInput = { reason: string; note: string };

type MissedReasonFormProps = {
  /** "What happened?" */
  question: string;
  /** The chips, as the backend's codes with their labels. */
  options: { value: string; label: string }[];
  /** "Anything else we should know? (optional)" */
  placeholder: string;
  /** "Send" */
  sendLabel: string;
  /** "Thanks for letting us know." */
  thanks: string;
  /** The longest note the backend takes. */
  noteMax: number;
  onSend: (input: MissedReasonInput) => void;
  pending?: boolean;
  /** Sent, here or before (a reload): the thanks line replaces the form. */
  sent: boolean;
  /** Why the last send failed, in the page's words. */
  error?: string | null;
};

/**
 * Session Join.dc.html, missed: "What happened?" for the person who missed a
 * session. One chip, an optional note, and Send, which stays off until a chip
 * is picked (the design; founder, Oct 21). Kept for EduFurther only, so
 * nothing here says who reads it.
 *
 * Not `ReasonField`, though both are chips and a box: that one is the reason
 * the other party is told on a cancel or decline, so its chips depend on the
 * side, its box appears only for "Something else" and is then required, and
 * it says who reads what. Here the box is always there and always optional,
 * nobody else reads it, and it sends itself. They share the parts (ChoiceChips,
 * Textarea, CharCount) rather than one component with modes.
 */
export function MissedReasonForm({
  question,
  options,
  placeholder,
  sendLabel,
  thanks,
  noteMax,
  onSend,
  pending = false,
  sent,
  error,
}: MissedReasonFormProps) {
  const id = useId();
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');
  // Sent from here: the form, and the Send that had focus, go, so focus moves
  // to the thanks line, which is read out. Not on a page that loads already
  // sent (a reload), where nothing just happened.
  const thanksRef = useRef<HTMLParagraphElement>(null);
  const [wasSent] = useState(sent);
  useEffect(() => {
    if (sent && !wasSent) thanksRef.current?.focus();
  }, [sent, wasSent]);

  if (sent)
    return (
      <p ref={thanksRef} tabIndex={-1} className={styles.thanks}>
        <Icon name="check" size={16} />
        {thanks}
      </p>
    );

  return (
    <form
      className={styles.form}
      aria-labelledby={`${id}-q`}
      onSubmit={(e) => {
        e.preventDefault();
        if (reason && !pending) onSend({ reason, note: note.trim() });
      }}
    >
      <span id={`${id}-q`} className={styles.question}>
        {question}
      </span>
      <ChoiceChips
        label={question}
        options={options}
        selected={reason ? [reason] : []}
        // Picking another replaces it; picking the same one clears it.
        onToggle={(v) => setReason(v === reason ? null : v)}
        describedBy={`${id}-q`}
      />
      <Textarea
        className={styles.note}
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={placeholder}
        maxLength={noteMax}
        aria-label={placeholder}
      />
      <CharCount count={note.length} max={noteMax} />
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <Button
          type="submit"
          variant="secondary-outlined"
          size="small"
          disabled={!reason || pending}
        >
          {sendLabel}
        </Button>
      </div>
    </form>
  );
}
