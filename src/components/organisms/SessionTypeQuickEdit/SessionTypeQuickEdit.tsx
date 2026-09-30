'use client';

import Link from 'next/link';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Select } from '@/components/atoms/Select/Select';
import { Switch } from '@/components/atoms/Switch/Switch';
import { DURATIONS } from '@/lib/utils/sessionTypeDraft';
import styles from './SessionTypeQuickEdit.module.css';

export type QuickEditValues = { durationMin: number; visible: boolean };

type SessionTypeQuickEditProps = {
  initial: QuickEditValues;
  /** The full editor, for everything else. */
  fullHref: string;
  saving: boolean;
  /** Why the last save failed, or null. */
  error: string | null;
  /** Only what changed; nothing changed closes without a save. */
  onSave: (changed: Partial<QuickEditValues>) => void;
  onCancel: () => void;
};

/**
 * The profile's quick edit, inside the "Edit {name}" modal (Mentor
 * Profile.dc.html `quickOpen`): length and visibility. Price reads "Free", not
 * editable, until payments are designed (design reply #62).
 */
export function SessionTypeQuickEdit({
  initial,
  fullHref,
  saving,
  error,
  onSave,
  onCancel,
}: SessionTypeQuickEditProps) {
  const [durationMin, setDuration] = useState(initial.durationMin);
  const [visible, setVisible] = useState(initial.visible);
  const id = useId();
  // The platform's lengths; an older type's own length stays offered, so
  // opening this never changes it by itself.
  const lengths = DURATIONS.includes(initial.durationMin)
    ? DURATIONS
    : [initial.durationMin, ...DURATIONS].sort((a, b) => a - b);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const changed: Partial<QuickEditValues> = {};
    if (durationMin !== initial.durationMin) changed.durationMin = durationMin;
    if (visible !== initial.visible) changed.visible = visible;
    if (Object.keys(changed).length === 0) onCancel();
    else onSave(changed);
  };
  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <p className={styles.field}>
        Price
        <span className={styles.free}>Free</span>
      </p>
      <label className={styles.field}>
        Length
        <Select
          className={styles.length}
          width={200}
          value={String(durationMin)}
          onChange={(e) => setDuration(Number(e.target.value))}
          options={lengths.map((n) => ({ value: String(n), label: `${n} min` }))}
        />
      </label>
      <div className={styles.toggle}>
        <span className={styles.toggleText}>
          <span id={`${id}-vis`} className={styles.toggleLabel}>
            Visible to mentees
          </span>
          <span id={`${id}-vis-d`} className={styles.toggleDesc}>
            Hidden types stay in Session types. Sessions already booked go ahead.
          </span>
        </span>
        <Switch
          checked={visible}
          onChange={setVisible}
          aria-labelledby={`${id}-vis`}
          aria-describedby={`${id}-vis-d`}
        />
      </div>
      <div className={styles.info}>
        <span className={styles.infoText}>
          Name, description, questions and booking rules are in the full editor.
        </span>
        <Link href={fullHref} className={styles.infoLink}>
          Open full editor
          <Icon name="arrow_forward" size={16} />
        </Link>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <Button type="button" variant="secondary-outlined" size="large" onClick={onCancel}>
          Cancel
        </Button>
        {/* aria-disabled, not disabled: a disabled button drops the focus it has. */}
        <Button
          type="submit"
          size="large"
          aria-disabled={saving || undefined}
          aria-busy={saving || undefined}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
