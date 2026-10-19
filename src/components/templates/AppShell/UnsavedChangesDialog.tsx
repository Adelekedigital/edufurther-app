'use client';

import { useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/templates/ConfirmDialog/ConfirmDialog';
import { SaveChangesDialog } from '@/components/templates/SaveChangesDialog/SaveChangesDialog';
import { unsavedSave } from '@/lib/utils/leaveGuard';

/**
 * Leaving a form with unsaved changes, by an in-app link or Logout. The
 * session-type form's design-confirmed discard confirm (design reply
 * 2026-09-29, #5), app-wide: "Discard your changes?", Keep editing first, the
 * destructive choice last. A form that can save itself (`useLeaveGuard`'s
 * `onSave`: Settings) gets "Save your changes?" with Save and continue instead
 * (owner, 2026-10-19).
 */
export function UnsavedChangesDialog({
  what,
  logout = false,
  onKeep,
  onDiscard,
  onSaved,
}: {
  /** Finishes "Your changes to …": "your About section", "this page". */
  what: string;
  /** Leaving by Logout: the destructive choice says so. */
  logout?: boolean;
  onKeep: () => void;
  onDiscard: () => void;
  /** Saved: carry on leaving. */
  onSaved: () => void;
}) {
  // Read once, as the dialog opens: the form that asked is the one to save.
  const [save] = useState(unsavedSave);
  const [saving, setSaving] = useState(false);
  // Gone before the save answered (the page moved on): nothing more to do.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  if (save)
    return (
      <SaveChangesDialog
        where={what}
        logout={logout}
        saving={saving}
        onKeep={onKeep}
        onDiscard={onDiscard}
        onSave={async () => {
          setSaving(true);
          const saved = await save().catch(() => false);
          if (!alive.current) return;
          setSaving(false);
          // Not saved: back to the form, where its errors are showing.
          if (saved) onSaved();
          else onKeep();
        }}
      />
    );
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
