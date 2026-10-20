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
  /** Moves on every failed Save, so the same error is heard again. */
  errorKey?: number;
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
  errorKey = 0,
  discardLabel,
  saveLabel,
  savingLabel,
  onDiscard,
  onSave,
  saving = false,
}: SaveBarProps) {
  return (
    <>
      {/* Outside the bar, which hides under a dialog: a failed "Save and
          continue" is heard while the dialog is still up. Always present, so
          the line is heard when it arrives. */}
      <span role="alert" className="sr-only">
        {error && <span key={errorKey}>{error}</span>}
      </span>
      <div role="region" aria-label={label} data-save-bar className={styles.bar}>
        {error && (
          <span aria-hidden className={styles.error}>
            {error}
          </span>
        )}
        <span className={styles.message}>{message}</span>
        <button type="button" className={styles.discard} onClick={onDiscard} disabled={saving}>
          {discardLabel}
        </button>
        <Button
          variant="primary"
          size="large"
          onClick={onSave}
          disabled={saving}
          aria-busy={saving}
        >
          {saving ? savingLabel : saveLabel}
        </Button>
      </div>
    </>
  );
}
