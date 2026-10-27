import Link from 'next/link';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { InfoTip } from '@/components/atoms/InfoTip/InfoTip';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { cx } from '@/lib/utils/cx';
import styles from './KpiCard.module.css';

/** A KPI's trend/status line: a short label with an optional icon and a tone. */
export type KpiTrend = {
  text: string;
  icon?: IconName;
  /** positive = green, negative = red, neutral = muted. */
  tone: 'positive' | 'neutral' | 'negative';
};

type Common = {
  label: string;
  /** The figure, already formatted. Null → a muted "No data yet", never 0. */
  value: string | null;
  /** A unit after the value ("hrs", "of 3"); omitted when there is none. */
  unit?: string;
  /** A trend line under the value. The design shows a trend or a link, not both. */
  trend?: KpiTrend;
  /**
   * The trend is still loading: hold its row with a placeholder, so the line
   * arriving later doesn't push everything below the card down (CLS).
   */
  trendPending?: boolean;
  /** Colours the figure: warning (amber) or danger (red), as the Missed tile does. */
  valueTone?: 'warning' | 'danger';
  /**
   * lg: the admin summary card (Admin.dc.html `mKpis`): roomier, a bold
   * figure, a regular label. Default: the dashboards' card.
   */
  size?: 'md' | 'lg';
  className?: string;
};

type KpiCardProps = Common &
  (
    | {
        /** An info tooltip (ⓘ) on the label row — the Mentor Dashboard's metric hint. */
        info?: string;
        /**
         * A link under the value (e.g. "View mentors"). The design's alternative to a
         * trend: a button with `onClick`, or a page link with `href`.
         */
        link?: { label: string } & ({ onClick: () => void } | { href: string });
        onClick?: never;
        ariaLabel?: never;
      }
    | {
        /**
         * The whole card is one button (Admin.dc.html summary cards, which open
         * a tab), named by `ariaLabel`. No `info` or `link`: a button can't
         * hold another control.
         */
        onClick: () => void;
        ariaLabel: string;
        info?: never;
        link?: never;
      }
  );

/**
 * One progress figure on a dashboard's stats strip (Mentee Dashboard v2.dc.html,
 * "Your progress"): a label, a big value with an optional unit, and either a
 * trend or a link beneath. Text-only — no icon tile — so it reads as a figure,
 * not a feature. Shared so the mentor dashboard can take the same tile.
 */
export function KpiCard(props: KpiCardProps) {
  const { size = 'md', className } = props;
  if (props.onClick) {
    // Inside a button only phrasing content is valid: the rows are spans.
    return (
      <button
        type="button"
        onClick={props.onClick}
        aria-label={props.ariaLabel}
        className={cx(styles.card, size === 'lg' && styles.lg, styles.action, className)}
      >
        <Figure {...props} row="span" />
      </button>
    );
  }
  return (
    <div className={cx(styles.card, size === 'lg' && styles.lg, className)}>
      <Figure {...props} row="div" />
    </div>
  );
}

function Figure({
  label,
  value,
  unit,
  info,
  trend,
  trendPending,
  link,
  valueTone,
  row: Row,
}: KpiCardProps & { row: 'span' | 'div' }) {
  const empty = value === null;
  return (
    <>
      {info ? (
        <div className={styles.labelRow}>
          <span className={styles.label}>{label}</span>
          <InfoTip label={info} />
        </div>
      ) : (
        <span className={styles.label}>{label}</span>
      )}
      <Row className={styles.valueRow}>
        <span
          className={cx(
            styles.value,
            valueTone && !empty && styles[valueTone],
            empty && styles.empty,
          )}
        >
          {value ?? 'No data yet'}
        </span>
        {unit && !empty && <span className={styles.unit}>{unit}</span>}
      </Row>
      {!trend && trendPending && (
        // The no-break space gives the row the trend's own line height.
        <span className={styles.trend}>
          {'\u00a0'}
          <Skeleton width="60%" height="12px" />
        </span>
      )}
      {trend && (
        <span className={cx(styles.trend, styles[trend.tone])}>
          {trend.icon && <Icon name={trend.icon} size={16} />}
          {trend.text}
        </span>
      )}
      {link &&
        ('href' in link ? (
          <Link href={link.href} prefetch={false} className={styles.link}>
            {link.label}
            <Icon name="arrow_forward" size={16} />
          </Link>
        ) : (
          <button type="button" className={styles.link} onClick={link.onClick}>
            {link.label}
            <Icon name="arrow_forward" size={16} />
          </button>
        ))}
    </>
  );
}
