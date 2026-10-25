import Link from 'next/link';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import styles from './StatusLinkRow.module.css';

type StatusLinkRowProps = {
  icon: IconName;
  label: string;
  /** The figure or fact. Null while it loads (a skeleton in its place). */
  value: string | null;
  href: string;
};

/**
 * Mentor Dashboard v2 status row: the whole row is one link, an icon disc, a
 * label over its value, and a chevron. The link's name reads "label: value",
 * so a screen reader hears what the row says, not just where it goes.
 */
export function StatusLinkRow({ icon, label, value, href }: StatusLinkRowProps) {
  return (
    <Link
      href={href}
      className={styles.row}
      // Spelled out: the visible label and value are separate lines, which an
      // accessible name would otherwise run together.
      aria-label={`${label}: ${value ?? 'Loading'}`}
      aria-busy={value === null || undefined}
    >
      <span className={styles.disc}>
        <Icon name={icon} size={20} />
      </span>
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {value === null ? (
          <span className={styles.value}>
            <Skeleton width="64px" height="16px" />
          </span>
        ) : (
          <span className={styles.value}>{value}</span>
        )}
      </span>
      <Icon name="chevron_right" size={18} className={styles.chevron} />
    </Link>
  );
}
