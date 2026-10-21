'use client';

import { useId } from 'react';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import {
  ConfirmActions,
  confirmClose,
  type ConfirmActionsProps,
} from '@/components/molecules/ConfirmActions/ConfirmActions';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import styles from './ConfirmDialog.module.css';

type ConfirmDialogProps = ConfirmActionsProps & {
  title: string;
  /** What happens, under the title in the header (Modal.dc.html `subtitle`). */
  subtitle?: string;
  /**
   * What happens, as a paragraph in the body instead: darker and below the
   * header (Integrations.dc.html `switchOpen`). For a confirm whose
   * explanation is more than an aside, which the header's tertiary ink
   * undersells. One of `subtitle` or `body`, not both.
   */
  body?: string;
  /** Header glyph; red for a danger confirm, blue otherwise. */
  icon: IconName;
  /** Closing while the request runs dismisses it and lets the request carry on. */
  onDismissWhilePending?: () => void;
  /** Under 768px: full screen (default), or a bottom sheet (Modal.dc.html `kind="confirm"`). */
  mobile?: 'full' | 'sheet';
};

/**
 * The app's "Are you sure?" (Modal.dc.html, size sm): title, what happens,
 * Keep · Confirm. An alertdialog that opens on the safe choice. Sessions'
 * ConfirmActionDialog (decline, withdraw, cancel, with a reason) moves onto it
 * in a follow-up PR.
 * While the request runs it can't be closed or kept (product 2026-10-12): the
 * request can't be called back, and the answer belongs in this dialog.
 */
export function ConfirmDialog({
  title,
  subtitle,
  body,
  icon,
  onDismissWhilePending,
  mobile,
  ...actions
}: ConfirmDialogProps) {
  const bodyId = useId();
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
      mobile={mobile}
      alert
      describedBy={body ? bodyId : undefined}
      onClose={onClose}
      closeDisabled={closeDisabled}
    >
      {body && (
        <p id={bodyId} className={styles.body}>
          {body}
        </p>
      )}
      <ConfirmActions {...actions} />
    </ModalShell>
  );
}
