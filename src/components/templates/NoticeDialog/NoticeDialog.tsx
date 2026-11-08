'use client';

import { useId, type ReactNode } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import styles from './NoticeDialog.module.css';

type NoticeDialogProps = {
  title: string;
  icon?: IconName;
  /** The message: a paragraph's content (it may hold a <strong>). */
  children: ReactNode;
  /** The one button, e.g. "Got it". */
  okLabel: string;
  onClose: () => void;
};

/**
 * Something happened and there's nothing to decide (Modal.dc.html
 * `kind="confirm"`, size sm, with one full-width primary button): Preview as
 * user's "Read only" and "Preview ended". Announced as an alertdialog; a sheet
 * on phones, like every confirm.
 */
export function NoticeDialog({ title, icon, children, okLabel, onClose }: NoticeDialogProps) {
  const bodyId = useId();
  return (
    <ModalShell
      title={title}
      icon={icon}
      size="sm"
      mobile="sheet"
      alert
      describedBy={bodyId}
      onClose={onClose}
    >
      <p id={bodyId} className={styles.body}>
        {children}
      </p>
      <Button variant="primary" size="large" fullWidth onClick={onClose}>
        {okLabel}
      </Button>
    </ModalShell>
  );
}
