'use client';

import { useRef, type KeyboardEvent } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './Tabs.module.css';

export type TabItem = {
  value: string;
  label: string;
  /** id of the tabpanel this tab controls. */
  panelId: string;
};

type TabsProps = {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  /** Names the tablist, e.g. "Profile". */
  label: string;
  className?: string;
};

/**
 * DS Tabs, `variant="line"` (_ds_bundle.js components/navigation/Tabs.jsx).
 * WAI-ARIA tabs with automatic activation: one tab stop; arrows, Home and End
 * move and select. Home/End are ours — the DS handles only the arrows.
 */
export function Tabs({ items, value, onChange, label, className }: TabsProps) {
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
    <div role="tablist" aria-label={label} className={cx(styles.list, className)}>
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
            tabIndex={on ? 0 : -1}
            className={cx(styles.tab, on && styles.on)}
            onClick={() => onChange(it.value)}
            onKeyDown={(e) => onKey(e, i)}
          >
            <span className={styles.label}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}
