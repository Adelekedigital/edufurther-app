'use client';

import { useId, useRef, type ReactNode } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Select, type SelectOption } from '@/components/atoms/Select/Select';
import { cx } from '@/lib/utils/cx';
import styles from './FilterBar.module.css';

export type FilterField = {
  key: string;
  label: string;
  options: SelectOption[];
  value: string;
  /** Not the default: the field wears Select's `changed` (blue) look. */
  changed: boolean;
  onChange: (value: string) => void;
};

type FilterBarProps = {
  /** Names the group, e.g. "Search and filter emails". */
  label: string;
  fields: FilterField[];
  /** A control before the filters, e.g. a labelled SearchField (Admin Emails). */
  lead?: ReactNode;
  /** "Showing N of M"; null until the list has loaded, so no "0" flashes. */
  count: string | null;
  /** Announce the count (when the screen doesn't announce its list itself). */
  liveCount?: boolean;
  clearLabel: string;
  /** Any filter (or the lead's search) in use: Clear filters shows. */
  active: boolean;
  onClear: () => void;
  /**
   * `fixed`: fields keep 200px (Admin.dc.html Mentors). `fill`: fields share
   * the row from 160px and the lead takes twice the room (Admin Emails.dc.html).
   */
  layout?: 'fixed' | 'fill';
};

/**
 * The admin list filter row: labelled Selects, the count and Clear filters on
 * the right. One row for every admin list (Mentors, Emails).
 */
export function FilterBar({
  label,
  fields,
  lead,
  count,
  liveCount = false,
  clearLabel,
  active,
  onClear,
  layout = 'fixed',
}: FilterBarProps) {
  const base = useId();
  const bar = useRef<HTMLDivElement>(null);
  return (
    <div ref={bar} role="group" aria-label={label} className={cx(styles.bar, styles[layout])}>
      {lead && <div className={styles.lead}>{lead}</div>}
      {fields.map((f) => (
        <div key={f.key} className={styles.field}>
          <span id={`${base}-${f.key}`} className={styles.label}>
            {f.label}
          </span>
          <Select
            aria-labelledby={`${base}-${f.key}`}
            density="md"
            text="sm"
            changed={f.changed}
            radius="sm"
            options={f.options}
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
            className={styles.select}
          />
        </div>
      ))}
      <div className={styles.end}>
        <span className={styles.count} aria-live={liveCount ? 'polite' : undefined}>
          {count}
        </span>
        {active && (
          <Button
            variant="text"
            size="small"
            onClick={() => {
              onClear();
              // The button leaves with the filters: keep focus in the bar, on its first control.
              requestAnimationFrame(() =>
                bar.current?.querySelector<HTMLElement>('input, [aria-labelledby]')?.focus(),
              );
            }}
          >
            {clearLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
