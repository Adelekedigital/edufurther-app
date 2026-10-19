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

/** What the Google Calendar row offers on its right. */
export type CalendarAction =
  /** A link-styled button (Connect, Reconnect, Try again); busy keeps it in the tab order. */
  | { kind: 'button'; label: string; onClick: () => void; busy?: boolean; busyLabel?: string }
  /** A plain status once it worked ("Connected"), not a control. */
  | { kind: 'status'; label: string }
  /** Nothing yet (still reading the connection), or nothing to do here. */
  | { kind: 'none' };

export type CalendarRow = {
  title: string;
  /** "(optional)" after the title; left out once connected. */
  optional?: string;
  body: string;
  /** warn: the line says something went wrong. */
  tone?: 'default' | 'warn';
  action: CalendarAction;
};

type ApprovedSummaryProps = {
  rows: readonly SummaryRow[];
  /** The optional Google Calendar row under a rule; connects in place. */
  calendar: CalendarRow;
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
            {calendar.title}
            {calendar.optional && (
              <>
                {' '}
                <span className={styles.optional}>{calendar.optional}</span>
              </>
            )}
          </span>
          <span
            className={calendar.tone === 'warn' ? `${styles.body} ${styles.warn}` : styles.body}
          >
            {calendar.body}
          </span>
        </span>
        <CalendarActionView action={calendar.action} />
      </div>
    </div>
  );
}

function CalendarActionView({ action }: { action: CalendarAction }) {
  if (action.kind === 'none') return null;
  if (action.kind === 'status')
    return (
      <span className={styles.status}>
        <Icon name="check_circle" size={18} />
        {action.label}
      </span>
    );
  return (
    <button
      type="button"
      className={styles.link}
      // Busy is not disabled: it says why, and keeps its place in the tab order.
      aria-busy={action.busy || undefined}
      onClick={action.busy ? undefined : action.onClick}
    >
      {action.busy ? (action.busyLabel ?? action.label) : action.label}
    </button>
  );
}
