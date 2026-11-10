import type { CSSProperties, ReactNode } from 'react';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Icon } from '@/components/atoms/Icon/Icon';
import { SOURCE_BADGE } from '@/lib/copy/adminAnalytics';
import type { KpiTrend } from '@/components/molecules/KpiCard/KpiCard';
import type { Change } from '@/lib/utils/analytics';
import { cx } from '@/lib/utils/cx';
import styles from './parts.module.css';

/**
 * The pieces every Analytics tab is built from (Admin Analytics.dc.html): one
 * of each, so the six tabs draw a card, a bar or a change line the same way.
 */

/** Where a number comes from (DS Badge, accent, sm): Database neutral, PostHog primary. */
export function SourceBadge({ source }: { source: 'db' | 'posthog' }) {
  return (
    <Badge type="accent" color={source === 'db' ? 'neutral' : 'primary'} size="sm">
      {SOURCE_BADGE[source]}
    </Badge>
  );
}

/** A tab's section: its h2 and source badge, then its content. */
export function Section({
  title,
  source,
  label,
  children,
}: {
  title: string;
  source: 'db' | 'posthog';
  /** The region's name when it differs from the heading. */
  label?: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={label ?? title} className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <SourceBadge source={source} />
      </div>
      {children}
    </section>
  );
}

/** A card inside a section: an h3, an optional control on its right, the body, a note. */
export function Panel({
  title,
  aside,
  hint,
  note,
  children,
  className,
  region,
}: {
  title: string;
  aside?: ReactNode;
  /** One line under the title (Guardrails' "Lower is better"). */
  hint?: string;
  note?: ReactNode;
  children: ReactNode;
  className?: string;
  /** A landmark of its own (Guardrails, `role="region"`). */
  region?: boolean;
}) {
  const head = <h3 className={styles.panelTitle}>{title}</h3>;
  return (
    <div
      className={cx(styles.panel, className)}
      role={region ? 'region' : undefined}
      aria-label={region ? title : undefined}
    >
      {aside ? (
        <div className={styles.panelHead}>
          {head}
          {aside}
        </div>
      ) : hint ? (
        <div className={styles.panelHeadStack}>
          {head}
          <span className={styles.hint}>{hint}</span>
        </div>
      ) : (
        head
      )}
      {children}
      {note && <span className={styles.note}>{note}</span>}
    </div>
  );
}

/** Two cards side by side from 1024px; stacked below. */
export function TwoCol({ children }: { children: ReactNode }) {
  return <div className={styles.twoCol}>{children}</div>;
}

/**
 * The change against the previous period: a sign always, an arrow where the
 * design draws one, coloured by whether the move is good, so colour is never
 * the only signal.
 */
export function ChangeText({
  change,
  arrow = false,
  suffix,
  size = 'xs',
  className,
}: {
  change: Change;
  arrow?: boolean;
  /** Words after the change (Guardrails' "· Worse"). */
  suffix?: string;
  size?: 'xs' | 'sm';
  className?: string;
}) {
  return (
    <span
      className={cx(
        styles.change,
        styles[change.tone],
        size === 'sm' && styles.changeSm,
        className,
      )}
    >
      {arrow && <Icon name={change.icon} size={size === 'sm' ? 18 : 14} />}
      {change.text}
      {suffix && ` · ${suffix}`}
    </span>
  );
}

/** A change as a KpiCard trend line (no arrow on the tiles, as drawn). */
export const kpiTrend = (c: Change | null): KpiTrend | undefined =>
  c ? { text: c.text, tone: KPI_TONE[c.tone] } : undefined;
const KPI_TONE = { good: 'positive', bad: 'negative', flat: 'neutral' } as const;

/** One bar on its track: the same look in a row of bars and in a table cell. */
export function Bar({
  width,
  tip,
  muted,
  className,
}: {
  /** 0 to 100. */
  width: number;
  tip?: string;
  muted?: boolean;
  className?: string;
}) {
  return (
    <span className={cx(styles.track, className)}>
      <span
        title={tip}
        className={cx(styles.bar, muted && styles.barMuted)}
        style={{ width: `${Math.max(0, Math.min(100, width))}%` }}
      />
    </span>
  );
}

export type BarRow = {
  key: string;
  label: string;
  /** 0 to 100: the bar's length. */
  width: number;
  value: ReactNode;
  /** The bar's hover title. */
  tip?: string;
  /** The muted bars (How requests end draws all but Completed grey). */
  muted?: boolean;
};

/**
 * Rows of label, bar and value. The design draws five sets, differing only in
 * column widths, bar height and track; each is a variant here (parts.module.css):
 * outcomes (How requests end), cohort (From application to bookable), invites
 * (Members from invites), mix (Completed sessions by topic or stage), funnel.
 */
export function BarRows({
  rows,
  variant,
  label,
}: {
  rows: BarRow[];
  variant: 'outcomes' | 'cohort' | 'invites' | 'mix' | 'funnel';
  /** With a label the rows are one image, read by this text (a funnel). */
  label?: string;
}) {
  return (
    <div
      className={cx(styles.bars, styles[variant])}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      {rows.map((r) => (
        <div key={r.key} className={styles.barRow}>
          <span className={styles.barLabel}>{r.label}</span>
          <Bar width={r.width} tip={r.tip} muted={r.muted} />
          <span className={styles.barValue}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * A small read-only table (`role="table"`, as the design draws it): the
 * columns share the width by the given CSS grid track list.
 */
export function DataTable({
  label,
  columns,
  rows,
  template,
}: {
  label: string;
  columns: string[];
  rows: { key: string; cells: ReactNode[] }[];
  template: string;
}) {
  const grid = { gridTemplateColumns: template } as CSSProperties;
  return (
    <div role="table" aria-label={label} className={styles.table}>
      <div role="row" className={cx(styles.tr, styles.th)} style={grid}>
        {columns.map((c) => (
          <span key={c} role="columnheader">
            {c}
          </span>
        ))}
      </div>
      {rows.map((r) => (
        <div key={r.key} role="row" className={cx(styles.tr, styles.td)} style={grid}>
          {r.cells.map((c, i) => (
            <span key={i} role="cell" className={i === 0 ? styles.firstCell : styles.num}>
              {c}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** The auto-fit grid of figure cards (Credits' flow, Growth's sign-ups). */
export const cardGrid = styles.cardGrid;
/** A table cell the design sets semibold (Credits' Expired). */
export const cellStrong = styles.cellStrong;
/** The table-cell bar's look. */
export const cellBar = styles.cellBar;
