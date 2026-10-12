'use client';

import type { IconName } from '@/components/atoms/Icon/iconNames';
import {
  ConfirmActions,
  confirmClose,
  type ConfirmActionsProps,
} from '@/components/molecules/ConfirmActions/ConfirmActions';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';

type ConfirmDialogProps = ConfirmActionsProps & {
  title: string;
  subtitle: string;
  /** Header glyph; red for a danger confirm, blue otherwise. */
  icon: IconName;
  /** Closing while the request runs dismisses it and lets the request carry on. */
  onDismissWhilePending?: () => void;
};

/**
 * Every "Are you sure?" in the app (Modal.dc.html, size sm): title, what
 * happens, Keep · Confirm. An alertdialog that opens on the safe choice.
 * While the request runs it can't be closed or kept (product 2026-10-12): the
 * request can't be called back, and the answer belongs in this dialog.
 */
export function ConfirmDialog({
  title,
  subtitle,
  icon,
  onDismissWhilePending,
  ...actions
}: ConfirmDialogProps) {
  const { onClose, closeDisabled } = confirmClose(
    !!actions.pending,
    actions.onKeep,
    onDismissWhilePending,
  );
  return (
    <ModalShell
      title={title}
      subtitle={subtitle}
      icon={icon}
      tone={(actions.tone ?? 'danger') === 'danger' ? 'danger' : 'default'}
      size="sm"
      alert
      onClose={onClose}
      closeDisabled={closeDisabled}
    >
      <ConfirmActions {...actions} />
    </ModalShell>
  );
}
