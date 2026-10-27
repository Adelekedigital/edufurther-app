'use client';

import { Icon } from '@/components/atoms/Icon/Icon';
import { ConfirmDialog } from '@/components/templates/ConfirmDialog/ConfirmDialog';
import type { AdminMentee } from '@/lib/api/data/adminCredits';
import { CONFIRM_COPY } from '@/lib/copy/adminCredits';
import { cx } from '@/lib/utils/cx';
import styles from './AddCreditsConfirm.module.css';

type AddCreditsConfirmProps = {
  mentee: AdminMentee;
  amount: number;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/** "Add {n} credits for {First}?" with the Now → After box (Admin.dc.html credits confirm). */
export function AddCreditsConfirm({
  mentee,
  amount,
  pending,
  onCancel,
  onConfirm,
}: AddCreditsConfirmProps) {
  const now = mentee.balance.left;
  return (
    <ConfirmDialog
      title={CONFIRM_COPY.title(amount, mentee.firstName)}
      subtitle={CONFIRM_COPY.body(amount, mentee.balance.resetsOn)}
      tone="default"
      keepLabel={CONFIRM_COPY.keep}
      confirmLabel={CONFIRM_COPY.confirm}
      pendingLabel={CONFIRM_COPY.pending}
      pending={pending}
      onKeep={onCancel}
      onConfirm={onConfirm}
      mobile="sheet"
    >
      <div className={styles.box}>
        <div className={styles.side}>
          <span className={styles.label}>{CONFIRM_COPY.now}</span>
          <span className={styles.value}>{now}</span>
        </div>
        <Icon name="arrow_forward" size={24} className={styles.arrow} />
        <div className={styles.side}>
          <span className={styles.label}>{CONFIRM_COPY.after}</span>
          <span className={cx(styles.value, styles.after)}>{now + amount}</span>
        </div>
      </div>
    </ConfirmDialog>
  );
}
