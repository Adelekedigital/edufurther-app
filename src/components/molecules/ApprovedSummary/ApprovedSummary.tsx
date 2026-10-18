import Link from 'next/link';
import { GoogleMark } from '@/components/atoms/GoogleMark/GoogleMark';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import styles from './ApprovedSummary.module.css';

export type SummaryRow = {
  icon: IconName;
  title: string;
  body: string;
  link?: { label: string; href: string };
};

type ApprovedSummaryProps = {
  rows: readonly SummaryRow[];
  /** The optional Google Calendar row under a rule (`Integrations` link). */
  calendar: { title: string; optional: string; body: string; label: string; href: string };
};

/** Approved.dc.html `single`: what was set up from the application, then Connect Google Calendar. */
export function ApprovedSummary({ rows, calendar }: ApprovedSummaryProps) {
  return (
    <div className={styles.card}>
      <ul className={styles.rows}>
        {rows.map((r) => (
          <li key={r.title} className={styles.row}>
            <span className={styles.tile}>
              <Icon name={r.icon} size={20} />
            </span>
            <span className={styles.text}>
              <span className={styles.title}>{r.title}</span>
              <span className={styles.body}>{r.body}</span>
            </span>
            {r.link && (
              <Link href={r.link.href} className={`${styles.link} ${styles.rowLink}`}>
                {r.link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
      <div className={styles.calendar}>
        <span className={styles.markTile}>
          <GoogleMark className={styles.mark} />
        </span>
        <span className={`${styles.text} ${styles.calendarText}`}>
          <span className={styles.title}>
            {calendar.title} <span className={styles.optional}>{calendar.optional}</span>
          </span>
          <span className={styles.body}>{calendar.body}</span>
        </span>
        <Link href={calendar.href} className={styles.link}>
          {calendar.label}
        </Link>
      </div>
    </div>
  );
}
