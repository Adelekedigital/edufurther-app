'use client';

import { forwardRef, useId, useState, type TextareaHTMLAttributes } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import { cx } from '@/lib/utils/cx';
import styles from './AiField.module.css';

export type AssistMode = 'draft' | 'improve';

type AiFieldProps = {
  /** Visible label (AiField.dc.html defaults it to "About"). */
  label: string;
  value: string;
  /** `drafted`: the text is still an AI draft, untouched (PRD B7 provenance). */
  onChange: (text: string, meta: { drafted: boolean }) => void;
  /** The text came in as an untouched AI draft. */
  drafted?: boolean;
  max: number;
  rows?: number;
  hint?: string;
  placeholder?: string;
  /** Shown under the box while the text is still the draft. */
  draftNote?: string;
  /**
   * "Write a draft" (empty box) or "Improve" (their own text). Resolves with
   * the new text; rejects with a message already worded for the user. Absent:
   * no AI actions, a plain field.
   */
  onAssist?: (mode: AssistMode, text: string) => Promise<string>;
  /** The caller's own error, described by the box as well as the hint. */
  invalid?: boolean;
  describedBy?: string;
  textareaProps?: Pick<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onKeyDown'>;
};

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

const LABELS = {
  draft: 'Write a draft',
  improve: 'Improve',
  drafting: 'Writing…',
  improving: 'Improving…',
  undo: 'Undo',
  badge: 'Drafted for you',
};

/**
 * The box for every long profile text (AiField.dc.html, PRD F6): an AI draft
 * or improvement on request, never saved by itself. An untouched draft wears
 * "Drafted for you" and offers no action; editing any word brings "Improve"
 * back. While working the box is read-only; Undo restores the text from before
 * the last AI change; a failure says so in the status line and leaves the text.
 */
export const AiField = forwardRef<HTMLTextAreaElement, AiFieldProps>(function AiField(
  {
    label,
    value,
    onChange,
    drafted = false,
    max,
    rows = 5,
    hint,
    placeholder,
    draftNote,
    onAssist,
    invalid,
    describedBy,
    textareaProps,
  },
  ref,
) {
  const id = useId();
  const hintId = `${id}-hint`;
  // The draft as it arrived: typing back to it still counts as untouched.
  const [base, setBase] = useState<string | null>(drafted ? value : null);
  const [busy, setBusy] = useState<AssistMode | null>(null);
  const [prev, setPrev] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const isDraft = (text: string, b: string | null) =>
    b !== null && norm(text) !== '' && norm(text) === norm(b);
  const ai = drafted && isDraft(value, base);
  const empty = !value.trim();

  const emit = (text: string, b: string | null) => onChange(text, { drafted: isDraft(text, b) });

  const run = async () => {
    if (!onAssist || busy) return;
    const mode: AssistMode = empty ? 'draft' : 'improve';
    setBusy(mode);
    setStatus('');
    try {
      const out = (await onAssist(mode, value)).slice(0, max);
      setPrev(value);
      setBase(out);
      emit(out, out);
    } catch (e) {
      // The text is left exactly as it was.
      setStatus(e instanceof Error && e.message ? e.message : 'That didn’t work. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const undo = () => {
    if (prev === null) return;
    const back = prev;
    setPrev(null);
    setBase(null);
    setStatus('');
    emit(back, null);
  };

  const showAction = !!onAssist && (!ai || empty || !!busy);
  const canUndo = prev !== null && !busy && prev !== value;

  return (
    <div className={styles.field}>
      <span className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        {ai && !busy && !empty && <span className={styles.badge}>{LABELS.badge}</span>}
      </span>
      <div className={cx(styles.box, invalid && styles.invalid)}>
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          maxLength={max}
          value={value}
          placeholder={placeholder}
          readOnly={!!busy}
          aria-busy={!!busy || undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={[describedBy, hintId].filter(Boolean).join(' ')}
          className={cx(styles.text, busy && styles.textBusy)}
          onChange={(e) => {
            setStatus('');
            emit(e.target.value, base);
          }}
          {...textareaProps}
        />
        <div className={styles.bar}>
          {/* Always in the DOM, so a failure is heard. */}
          <span aria-live="polite" className={styles.status}>
            {status}
          </span>
          <div className={styles.actions}>
            {canUndo && (
              <button type="button" className={styles.undo} onClick={undo}>
                <Icon name="undo" size={16} />
                {LABELS.undo}
              </button>
            )}
            {showAction && (
              <button
                type="button"
                className={cx(styles.action, busy && styles.actionBusy)}
                onClick={run}
                aria-disabled={!!busy || undefined}
                aria-busy={!!busy || undefined}
              >
                {busy ? <Spinner size={14} /> : <Icon name="auto_awesome" size={16} />}
                {busy === 'draft'
                  ? LABELS.drafting
                  : busy === 'improve'
                    ? LABELS.improving
                    : empty
                      ? LABELS.draft
                      : LABELS.improve}
              </button>
            )}
          </div>
        </div>
      </div>
      {draftNote && ai && !busy && !empty && (
        <p className={styles.note}>
          <Icon name="auto_awesome" size={16} className={styles.noteIcon} />
          <span>{draftNote}</span>
        </p>
      )}
      <p id={hintId} className={styles.hint}>
        <span>{hint}</span>
        {/* Not a live region: a keystroke-by-keystroke count is noise. */}
        <span>
          {value.length}/{max}
        </span>
      </p>
    </div>
  );
});
