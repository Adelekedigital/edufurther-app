'use client';

import {
  forwardRef,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type TextareaHTMLAttributes,
} from 'react';
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
  /** While an AI call runs: the form around it holds its Save. */
  onBusyChange?: (busy: boolean) => void;
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
  // Ours (the prototype's status line is always empty): heard, not shown.
  drafted: 'Draft added. Undo to go back.',
  improved: 'Improved. Undo to go back.',
  restored: 'Your text is back.',
  // Ours, shown: an improve that changed nothing.
  unchanged: 'No changes to suggest.',
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
    onBusyChange,
  },
  ref,
) {
  const id = useId();
  const hintId = `${id}-hint`;
  const badgeId = `${id}-badge`;
  const box = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => box.current!, []);
  // The draft as it arrived: typing back to it still counts as untouched.
  const [base, setBase] = useState<string | null>(drafted ? value : null);
  const [busy, setBusyState] = useState<AssistMode | null>(null);
  const [prev, setPrev] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  // Heard only: the outcome of an AI change, for screen readers.
  const [said, setSaid] = useState('');
  // A value the parent set from outside (a refetch, a reset), not one this
  // field emitted: the draft, Undo and the status belong to the old text.
  const [own, setOwn] = useState(value);
  if (value !== own) {
    setOwn(value);
    setBase(drafted ? value : null);
    setPrev(null);
    setStatus('');
  }

  const isDraft = (text: string, b: string | null) =>
    b !== null && norm(text) !== '' && norm(text) === norm(b);
  const ai = drafted && isDraft(value, base);
  const empty = !value.trim();

  const emit = (text: string, b: string | null) => {
    setOwn(text);
    onChange(text, { drafted: isDraft(text, b) });
  };
  const setBusy = (b: AssistMode | null) => {
    setBusyState(b);
    onBusyChange?.(b !== null);
  };
  // The button pressed may be gone (the draft hides it, Undo hides itself):
  // focus goes back to the text, never to the page.
  const refocus = () => requestAnimationFrame(() => box.current?.focus());

  const run = async () => {
    if (!onAssist || busy) return;
    const mode: AssistMode = empty ? 'draft' : 'improve';
    setBusy(mode);
    setStatus('');
    setSaid('');
    try {
      const out = (await onAssist(mode, value)).slice(0, max);
      if (mode === 'improve' && norm(out) === norm(value)) {
        // Nothing changed: their words stay theirs, not a draft.
        setStatus(LABELS.unchanged);
        return;
      }
      setPrev(value);
      setBase(out);
      emit(out, out);
      setSaid(mode === 'draft' ? LABELS.drafted : LABELS.improved);
      refocus();
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
    setSaid(LABELS.restored);
    refocus();
  };

  const showAction = !!onAssist && (!ai || empty || !!busy);
  const canUndo = prev !== null && !busy && prev !== value;

  return (
    <div className={styles.field}>
      <span className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        {ai && !busy && !empty && (
          <span id={badgeId} className={styles.badge}>
            {LABELS.badge}
          </span>
        )}
      </span>
      <div className={cx(styles.box, invalid && styles.invalid)}>
        <textarea
          ref={box}
          id={id}
          rows={rows}
          maxLength={max}
          value={value}
          placeholder={placeholder}
          readOnly={!!busy}
          aria-busy={!!busy || undefined}
          aria-invalid={invalid || undefined}
          // The badge too: "still an AI draft" is what the provenance rule is about.
          aria-describedby={[describedBy, ai && !busy && !empty ? badgeId : null, hintId]
            .filter(Boolean)
            .join(' ')}
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
          <span aria-live="polite" className="sr-only">
            {said}
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
