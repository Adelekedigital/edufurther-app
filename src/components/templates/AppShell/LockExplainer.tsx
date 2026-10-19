'use client';

import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import type { LockCopy } from '@/lib/utils/access';
import styles from './LockExplainer.module.css';

type LockExplainerProps = {
  /** The locked item's label, e.g. "Bookings". */
  item: string;
  copy: LockCopy;
  onClose: () => void;
};

/**
 * Why a nav item is locked, and the way to unlock it (AppShell.dc.html lock
 * explainer: Modal size md, so every lock title fits one line on desktop; icon
 * lock, a sheet on phones). Focus, Escape and focus back to the nav item are
 * ModalShell's.
 */
export function LockExplainer({ item, copy, onClose }: LockExplainerProps) {
  return (
    <ModalShell title={copy.title(item)} icon="lock" size="md" mobile="sheet" onClose={onClose}>
      <p className={styles.body}>{copy.body}</p>
      <div className={styles.actions}>
        <Button variant="text" size="large" className={styles.action} onClick={onClose}>
          Not now
        </Button>
        <ButtonLink href={copy.href} size="large" className={styles.action} onClick={onClose}>
          {copy.cta}
        </ButtonLink>
      </div>
    </ModalShell>
  );
}
