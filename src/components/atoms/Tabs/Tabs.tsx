'use client';

import { useRef, type KeyboardEvent } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './Tabs.module.css';

export type TabItem = {
  value: string;
  label: string;
  /** id of the tabpanel this tab controls. */
  panelId: string;
  /** A count pill after the label. `null` or absent draws none. */
  count?: number | null;
  /**
   * What the count means, read after the label ("Pending, 2 awaiting your
   * response"). The pill itself is hidden from the accessibility tree, so a
   * count without this is a number nobody can hear.
   */
  countLabel?: string;
  /** A dot after the label (a pill tab with unsaved work); `markLabel` is read with the tab. */
  marked?: boolean;
  markLabel?: string;
};

type TabsProps = {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  /** Names the tablist, e.g. "Profile". */
  label: string;
  /**
   * How a count is drawn: a pill (Bookings.dc.html) or "(N)" after the label
   * (Mentor Profile.dc.html). One rule either way: a known count shows, 0
   * included; `null` (unknown) shows nothing. As text it is part of the tab's
   * name, read as seen ("Reviews (0)"), so `countLabel` isn't used.
   */
  countStyle?: 'pill' | 'text';
  /**
   * `line`: the page's tab row. `pill`: rounded tabs side by side, a choice
   * within a screen (DS `variant="pill"`; Admin Emails' "Who gets it").
   */
  variant?: 'line' | 'pill';
  className?: string;
};

/** The tab's name when the count pill or the mark adds words to its label. */
function nameOf(it: TabItem, countStyle: 'pill' | 'text'): string | undefined {
  const extra = [countStyle === 'pill' && it.countLabel, it.marked && it.markLabel].filter(Boolean);
  return extra.length ? [it.label, ...extra].join(', ') : undefined;
}

/**
 * DS Tabs, `variant="line"` or `"pill"` (_ds_bundle.js components/navigation/Tabs.jsx).
 * WAI-ARIA tabs with automatic activation: one tab stop; arrows, Home and End
 * move and select. Home/End are ours — the DS handles only the arrows.
 */
export function Tabs({
  items,
  value,
  onChange,
  label,
  countStyle = 'pill',
  variant = 'line',
  className,
}: TabsProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const select = (i: number) => {
    const it = items[(i + items.length) % items.length]!;
    onChange(it.value);
    refs.current[(i + items.length) % items.length]?.focus();
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    const to =
      e.key === 'ArrowRight'
        ? i + 1
        : e.key === 'ArrowLeft'
          ? i - 1
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? items.length - 1
              : null;
    if (to === null) return;
    e.preventDefault();
    select(to);
  };
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cx(styles.list, variant === 'pill' && styles.pills, className)}
    >
      {items.map((it, i) => {
        const on = it.value === value;
        return (
          <button
            key={it.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${it.panelId}-tab`}
            aria-selected={on}
            aria-controls={it.panelId}
            aria-label={nameOf(it, countStyle)}
            tabIndex={on ? 0 : -1}
            className={cx(styles.tab, on && styles.on)}
            onClick={() => onChange(it.value)}
            onKeyDown={(e) => onKey(e, i)}
          >
            <span className={styles.label}>
              {it.label}
              {it.count != null &&
                (countStyle === 'pill' ? (
                  <span aria-hidden="true" className={styles.count}>
                    {it.count}
                  </span>
                ) : (
                  ` (${it.count})`
                ))}
              {it.marked && <span aria-hidden="true" className={styles.mark} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
