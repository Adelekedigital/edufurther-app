'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Textarea } from '@/components/atoms/Input/Input';
import { ABOUT_MAX } from '@/lib/utils/profileLimits';
import styles from './AboutEditor.module.css';

type AboutEditorProps = {
  initial: string;
  onSave: (text: string) => void;
  onCancel: () => void;
  saving: boolean;
  error?: string | null;
};

/**
 * The owner's About, edited in place (Mentor Profile.dc.html `editingAbout`):
 * a 600-character textarea, Save, Cancel and "n / 600". The textarea has focus
 * on open; Escape cancels.
 */
export function AboutEditor({ initial, onSave, onCancel, saving, error }: AboutEditorProps) {
  const [text, setText] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!saving) onSave(text);
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
      <Textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={ABOUT_MAX}
        rows={6}
        aria-label="About"
        invalid={!!error}
        className={styles.text}
      />
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <Button type="submit" size="medium" disabled={saving} aria-busy={saving || undefined}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" variant="text" size="medium" onClick={onCancel}>
          Cancel
        </Button>
        {/* Not a live region: a keystroke-by-keystroke count is noise. */}
        <span className={styles.count}>
          {text.length} / {ABOUT_MAX}
        </span>
      </div>
    </form>
  );
}
