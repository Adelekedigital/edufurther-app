import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { InfoTip } from '@/components/atoms/InfoTip/InfoTip';
import { cx } from '@/lib/utils/cx';
import styles from './KpiCard.module.css';

/** A KPI's trend/status line: a short label with an optional icon and a tone. */
export type KpiTrend = {
  text: string;
  icon?: IconName;
  /** positive = green, negative = red, neutral = muted. */
  tone: 'positive' | 'neutral' | 'negative';
};

type KpiCardProps = {
  label: string;
  /** The figure, already formatted. Null → a muted "No data yet", never 0. */
  value: string | null;
  /** A unit after the value ("hrs", "of 3"); omitted when there is none. */
  unit?: string;
  /** An info tooltip (ⓘ) on the label row — the Mentor Dashboard's metric hint. */
  info?: string;
  /** A trend line under the value. The design shows a trend or a link, not both. */
  trend?: KpiTrend;
  /** A link under the value (e.g. "View mentors"). The design's alternative to a trend. */
  link?: { label: string; onClick: () => void };
  className?: string;
};

/**
 * One progress figure on a dashboard's stats strip (Mentee Dashboard v2.dc.html,
 * "Your progress"): a label, a big value with an optional unit, and either a
 * trend or a link beneath. Text-only — no icon tile — so it reads as a figure,
 * not a feature. Shared so the mentor dashboard can take the same tile.
 */
export function KpiCard({ label, value, unit, info, trend, link, className }: KpiCardProps) {
  const empty = value === null;
  return (
    <div className={cx(styles.card, className)}>
      {info ? (
        <div className={styles.labelRow}>
          <span className={styles.label}>{label}</span>
          <InfoTip label={info} />
        </div>
      ) : (
        <span className={styles.label}>{label}</span>
      )}
      <div className={styles.valueRow}>
        <span className={cx(styles.value, empty && styles.empty)}>{value ?? 'No data yet'}</span>
        {unit && !empty && <span className={styles.unit}>{unit}</span>}
      </div>
      {trend && (
        <span className={cx(styles.trend, styles[trend.tone])}>
          {trend.icon && <Icon name={trend.icon} size={16} />}
          {trend.text}
        </span>
      )}
      {link && (
        <button type="button" className={styles.link} onClick={link.onClick}>
          {link.label}
          <Icon name="arrow_forward" size={16} />
        </button>
      )}
    </div>
  );
}
