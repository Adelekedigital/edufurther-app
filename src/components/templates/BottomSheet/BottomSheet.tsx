'use client';

import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from '@/components/atoms/IconButton/IconButton';
import { useFocusTrap } from '@/lib/utils/useFocusTrap';
import styles from './BottomSheet.module.css';

type BottomSheetProps = {
  title: string;
  /** Before the title, e.g. the credits' toll mark. */
  icon?: ReactNode;
  /** The dialog's name when the title is a value ("8 credits left"), not a name. */
  label?: string;
  /** For a trigger's `aria-controls`. */
  id?: string;
  onClose: () => void;
  children: ReactNode;
  /** Pinned under the scrolling body, e.g. "Got it". */
  footer?: ReactNode;
};

/**
 * Session Join.dc.html's phone sheet (`jsSheet`): rises from the bottom, at
 * most 80% of the screen, with a grab handle, the title and a close. For
 * reading, not for work in progress, so the backdrop closes it, unlike
 * ModalShell. Focus in, Tab kept inside, Escape, scroll lock and focus back
 * are `useFocusTrap`'s. One sheet for every phone read-out (Session Join,
 * Your credits), so they look and behave the same.
 */
export function BottomSheet({
  title,
  icon,
  label,
  id,
  onClose,
  children,
  footer,
}: BottomSheetProps) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, onClose);

  return createPortal(
    <div className={styles.root}>
      <div className={styles.overlay} aria-hidden onClick={onClose} />
      <div
        ref={ref}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-labelledby={label ? undefined : titleId}
        tabIndex={-1}
        className={styles.sheet}
      >
        <span className={styles.handle} aria-hidden />
        {/* div, not <header>: inside a dialog it reads as a duplicate page landmark (axe). */}
        <div className={styles.head}>
          <h2 id={titleId} className={styles.title}>
            {icon}
            {title}
          </h2>
          <IconButton size="lg" icon="close" aria-label="Close" onClick={onClose} />
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
