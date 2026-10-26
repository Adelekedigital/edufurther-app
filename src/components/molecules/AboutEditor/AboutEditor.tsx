'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useLeaveGuard } from '@/lib/utils/leaveGuard';
import { Button } from '@/components/atoms/Button/Button';
import { AiField, type AssistMode } from '@/components/molecules/AiField/AiField';
import { ABOUT_MAX } from '@/lib/utils/profileLimits';
import styles from './AboutEditor.module.css';

/** What a writing-assist call gives back: the text, and the prompt it came from. */
export type AboutAssist = (
  mode: AssistMode,
  text: string,
) => Promise<{ text: string; promptVersion: string }>;

type AboutEditorProps = {
  initial: string;
  /** The saved About is still an untouched AI draft. */
  initialDrafted?: boolean;
  /** `drafted`: still the untouched draft (and the prompt that wrote it), for provenance. */
  onSave: (text: string, meta: { drafted: boolean; promptVersion: string | null }) => void;
  onCancel: () => void;
  saving: boolean;
  error?: string | null;
  /** "Write a draft" / "Improve" (PRD F6). Absent: a plain field. */
  assist?: AboutAssist;
  /** The field's label; "About" (the mentor's) by default, "Short bio" for a mentee. */
  label?: string;
  /** The line under the field; null for none. */
  hint?: string | null;
  rows?: number;
  /** What the leave guard calls the edit ("your About section"). */
  leaveLabel?: string;
};

/**
 * The owner's About, edited in place (Mentor Profile.dc.html `editingAbout`):
 * an AiField (1,500 characters, 6 rows, the design's hint), then Save and
 * Cancel. The box has focus on open; Escape cancels. Nothing the AI writes is
 * saved until Save.
 */
export function AboutEditor({
  initial,
  initialDrafted = false,
  onSave,
  onCancel,
  saving,
  error,
  assist,
  label = 'About',
  hint = 'Lead with the path you’ve walked.',
  rows = 6,
  leaveLabel = 'your About section',
}: AboutEditorProps) {
  const [text, setText] = useState(initial);
  const [drafted, setDrafted] = useState(initialDrafted);
  // An AI call is running: Save waits (the box is read-only meanwhile).
  const [assisting, setAssisting] = useState(false);
  // The prompt behind the text in the box, kept for provenance (PRD B7).
  const promptVersion = useRef<string | null>(null);
  // Leaving with edits asks first (any in-app link, Logout, the browser's
  // prompt). Against the text it opened on: a refetch mid-edit isn't an edit.
  const [opened] = useState(initial);
  useLeaveGuard(text !== opened, leaveLabel);
  const ref = useRef<HTMLTextAreaElement>(null);
  const errorId = useId();
  // A failed save: back to the text, whose description now carries why.
  useEffect(() => {
    if (error) ref.current?.focus();
  }, [error]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!saving && !assisting)
      onSave(text, { drafted, promptVersion: drafted ? promptVersion.current : null });
  };
  return (
    <form
      className={styles.form}
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      }}
    >
      <AiField
        ref={ref}
        label={label}
        value={text}
        drafted={drafted}
        onChange={(next, meta) => {
          setText(next);
          setDrafted(meta.drafted);
        }}
        max={ABOUT_MAX}
        rows={rows}
        hint={hint ?? undefined}
        onAssist={
          assist &&
          (async (mode, current) => {
            const r = await assist(mode, current);
            promptVersion.current = r.promptVersion;
            return r.text;
          })
        }
        invalid={!!error}
        describedBy={error ? errorId : undefined}
        onBusyChange={setAssisting}
      />
      {error && (
        <p id={errorId} role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <Button
          type="submit"
          size="medium"
          aria-disabled={saving || assisting || undefined}
          aria-busy={saving || undefined}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" variant="text" size="medium" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
