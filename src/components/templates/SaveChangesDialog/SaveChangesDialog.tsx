'use client';

import { Button } from '@/components/atoms/Button/Button';
import { confirmClose } from '@/components/molecules/ConfirmActions/ConfirmActions';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { LEAVE_COPY } from '@/lib/copy/leave';
import styles from './SaveChangesDialog.module.css';

type SaveChangesDialogProps = {
  /** Finishes "Your changes on …": the tab's name ("Profile"). */
  where: string;
  /** A different line under the title (collapsing Goals: "Your changes to your goals…"). */
  subtitle?: string;
  /** Leaving by Logout: Discard and Save say they log out too. */
  logout?: boolean;
  onDiscard: () => void;
  onSave: () => void;
  onKeep: () => void;
  /** The save is running: it can't be closed or answered until it does. */
  saving?: boolean;
};

/**
 * Leaving a form that can save itself (Mentee Settings.dc.html `leaveGuard`
 * confirm, owner 2026-10-19): "Save your changes?" with Discard and Save and
 * continue side by side, and Keep editing under them. Closing is Keep editing,
 * except while the save runs: then nothing closes it (Escape included), so a
 * save that lands can't carry on a move the person already called off.
 */
export function SaveChangesDialog({
  where,
  subtitle,
  logout = false,
  onDiscard,
  onSave,
  onKeep,
  saving = false,
}: SaveChangesDialogProps) {
  const { onClose, closeDisabled } = confirmClose(saving, onKeep);
  return (
    <ModalShell
      title={LEAVE_COPY.title}
      subtitle={subtitle ?? LEAVE_COPY.sub(where)}
      icon="edit_note"
      size="sm"
      // A bottom sheet on phones (Mentee Settings.dc.html `kind="confirm"`).
      mobile="sheet"
      alert
      onClose={onClose}
      closeDisabled={closeDisabled}
    >
      <div className={styles.choices}>
        <Button
          variant="secondary-outlined"
          size="large"
          fullWidth
          onClick={onDiscard}
          disabled={saving}
        >
          {logout ? LEAVE_COPY.discardLogout : LEAVE_COPY.discard}
        </Button>
        <Button
          variant="primary"
          size="large"
          fullWidth
          onClick={onSave}
          disabled={saving}
          aria-busy={saving}
        >
          {logout ? LEAVE_COPY.saveLogout : LEAVE_COPY.save}
        </Button>
      </div>
      <div className={styles.keep}>
        <Button variant="text-secondary" onClick={onKeep} disabled={saving}>
          {LEAVE_COPY.keep}
        </Button>
      </div>
    </ModalShell>
  );
}
