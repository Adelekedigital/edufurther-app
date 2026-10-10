'use client';

import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from '@/components/atoms/IconButton/IconButton';
import { useFocusTrap } from '@/lib/utils/useFocusTrap';
import styles from './BottomSheet.module.css';

type BottomSheetProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/**
 * Session Join.dc.html's phone sheet (`jsSheet`): rises from the bottom, at
 * most 80% of the screen, with a grab handle, the title and a close. For
 * reading, not for work in progress, so the backdrop closes it, unlike
 * ModalShell. Focus in, Tab kept inside, Escape, scroll lock and focus back
 * are `useFocusTrap`'s.
 */
export function BottomSheet({ title, onClose, children }: BottomSheetProps) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, onClose);

  return createPortal(
    <div className={styles.root}>
      <div className={styles.overlay} aria-hidden onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={styles.sheet}
      >
        <span className={styles.handle} aria-hidden />
        {/* div, not <header>: inside a dialog it reads as a duplicate page landmark (axe). */}
        <div className={styles.head}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <IconButton size="lg" icon="close" aria-label="Close" onClick={onClose} />
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
