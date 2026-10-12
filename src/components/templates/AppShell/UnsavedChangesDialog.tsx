'use client';

import { ConfirmDialog } from '@/components/templates/ConfirmDialog/ConfirmDialog';

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
    <ConfirmDialog
      title="Discard your changes?"
      subtitle={`Your changes to ${what} won’t be saved.`}
      icon="delete"
      keepLabel="Keep editing"
      confirmLabel={logout ? 'Discard and log out' : 'Discard'}
      onKeep={onKeep}
      onConfirm={onDiscard}
    />
  );
}
