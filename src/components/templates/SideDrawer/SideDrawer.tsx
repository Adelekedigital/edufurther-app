'use client';

import { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '@/lib/utils/cx';
import { useFocusTrap } from '@/lib/utils/useFocusTrap';
import { IconButton } from '@/components/atoms/IconButton/IconButton';
import styles from './SideDrawer.module.css';

type SideDrawerProps = {
  /** Shown while true; closing unmounts it, which gives focus back to the opener. */
  open: boolean;
  /** The dialog's name: whose details these are ("Credits for Amara Okafor"). */
  title: string;
  /** md 520px (admin credits), lg 560px (admin mentors). Full width under 768px. */
  width?: 'md' | 'lg';
  onClose: () => void;
  /** The header row's content (avatar, name, meta), drawn beside the Close button. */
  header?: ReactNode;
  children: ReactNode;
  /** Pinned to the bottom while the body scrolls (the mentor drawer's actions). */
  footer?: ReactNode;
};

/**
 * A details panel that slides over the page from the right, over a dim
 * backdrop (Admin.dc.html drawers). A dialog: `useFocusTrap` gives focus in,
 * Tab kept inside, Escape, the scroll lock and focus back to the opener.
 * Unlike ModalShell the backdrop closes it: a drawer holds details to read,
 * and anything typed in it lives in a confirm of its own.
 */
export function SideDrawer(props: SideDrawerProps) {
  if (!props.open) return null;
  return <Drawer {...props} />;
}

function Drawer({ title, width = 'md', onClose, header, children, footer }: SideDrawerProps) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, onClose);
  return createPortal(
    <div className={styles.root}>
      <div className={styles.backdrop} aria-hidden onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cx(styles.drawer, styles[width])}
      >
        <div className={styles.body}>
          <div className={styles.head}>
            <div className={styles.headMain}>{header}</div>
            <IconButton size="lg" icon="close" aria-label="Close" onClick={onClose} />
          </div>
          {children}
        </div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
