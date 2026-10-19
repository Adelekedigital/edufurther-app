'use client';

import { Button } from '@/components/atoms/Button/Button';
import styles from './SaveBar.module.css';

type SaveBarProps = {
  /** "Unsaved changes to your profile". */
  message: string;
  /** The region's name for screen readers. */
  label: string;
  /** "Fill in the required fields to continue.", while Save was tried with gaps. */
  error?: string | null;
  discardLabel: string;
  saveLabel: string;
  savingLabel: string;
  onDiscard: () => void;
  onSave: () => void;
  saving?: boolean;
};

/**
 * The explicit-save bar (Mentee Settings.dc.html `showSaveBar`): pinned at the
 * bottom of the screen while a tab has unsaved changes, with Discard and Save
 * changes. On phones it spans the width above the tab bar.
 */
export function SaveBar({
  message,
  label,
  error,
  discardLabel,
  saveLabel,
  savingLabel,
  onDiscard,
  onSave,
  saving = false,
}: SaveBarProps) {
  return (
    <div role="region" aria-label={label} data-save-bar className={styles.bar}>
      {error && (
        <span role="alert" className={styles.error}>
          {error}
        </span>
      )}
      <span className={styles.message}>{message}</span>
      <button type="button" className={styles.discard} onClick={onDiscard} disabled={saving}>
        {discardLabel}
      </button>
      <Button variant="primary" size="large" onClick={onSave} disabled={saving} aria-busy={saving}>
        {saving ? savingLabel : saveLabel}
      </Button>
    </div>
  );
}
