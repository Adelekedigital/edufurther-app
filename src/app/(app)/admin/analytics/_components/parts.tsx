import type { CSSProperties, ReactNode } from 'react';
import { Badge } from '@/components/atoms/Badge/Badge';
import { SOURCE_BADGE } from '@/lib/copy/adminAnalytics';
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
