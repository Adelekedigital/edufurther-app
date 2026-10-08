'use client';

import { useId, type ReactNode } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { cx } from '@/lib/utils/cx';
import styles from './DisclosureRow.module.css';

type DisclosureRowProps = {
  icon: IconName;
  title: string;
  /** One line of what's inside, truncated. */
  preview: string;
  open: boolean;
  onToggle: () => void;
  /** A hairline above it: every row but the first. */
  divided?: boolean;
  children: ReactNode;
};

/**
 * Session Join.dc.html: a row that opens to show more (the WAI-ARIA disclosure
 * pattern: a real button with `aria-expanded`, controlling the panel).
 */
export function DisclosureRow({
  icon,
  title,
  preview,
  open,
  onToggle,
  divided,
  children,
}: DisclosureRowProps) {
  const panelId = useId();
  return (
    <div className={cx(styles.row, divided && styles.divided)}>
      <button
        type="button"
        className={cx(styles.toggle, open && styles.open)}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span aria-hidden className={styles.icon}>
          <Icon name={icon} size={18} />
        </span>
        <span className={styles.text}>
          <span className={styles.title}>{title}</span>
          <span className={styles.preview}>{preview}</span>
        </span>
        <span aria-hidden className={styles.chevron}>
          <Icon name={open ? 'expand_less' : 'expand_more'} size={20} />
        </span>
      </button>
      <div id={panelId} hidden={!open} className={styles.panel}>
        {children}
      </div>
    </div>
  );
}
