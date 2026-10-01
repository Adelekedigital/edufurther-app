'use client';

import { Button } from '@/components/atoms/Button/Button';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import styles from './AppShell.module.css';

/**
 * Leaving a form with unsaved changes, by an in-app link or Logout. The
 * session-type form's design-confirmed discard confirm (design reply
 * 2026-09-29, #5), app-wide: "Discard your changes?", Keep editing first, the
 * destructive choice last. Product chose no "Save and continue" (2026-10-01).
 */
export function UnsavedChangesDialog({
  what,
  logout = false,
  onKeep,
  onDiscard,
}: {
  /** Finishes "Your changes to …": "your About section", "this page". */
  what: string;
  /** Leaving by Logout: the destructive choice says so. */
  logout?: boolean;
  onKeep: () => void;
  onDiscard: () => void;
}) {
  return (
    <ModalShell
      title="Discard your changes?"
      subtitle={`Your changes to ${what} won’t be saved.`}
      icon="delete"
      tone="danger"
      size="sm"
      onClose={onKeep}
    >
      <div className={styles.confirmButtons}>
        <Button size="large" variant="secondary-outlined" fullWidth onClick={onKeep}>
          Keep editing
        </Button>
        <Button size="large" variant="destructive" fullWidth onClick={onDiscard}>
          {logout ? 'Discard and log out' : 'Discard'}
        </Button>
      </div>
    </ModalShell>
  );
}
