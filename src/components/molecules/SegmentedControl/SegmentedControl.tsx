'use client';

import { useRef, type KeyboardEvent } from 'react';
import { cx } from '@/lib/utils/cx';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import styles from './SegmentedControl.module.css';

export type Segment<V extends string> = { value: V; label: string; icon?: IconName };

type SegmentedControlProps<V extends string> = {
  options: Segment<V>[];
  value: V;
  onChange: (value: V) => void;
  /** Names the group, e.g. "Price" or "Answer type". */
  label: string;
  /**
   * fill: segments share the width (Price, rule rows). hug: each segment is as
   * wide as its label, with its icon (Answer type).
   */
  layout?: 'fill' | 'hug';
  /** Width of the whole control; the design draws Price at 200px. */
  width?: number;
  className?: string;
};

/**
 * Segmented radio group (Session Types.dc.html Price, Answer type). WAI-ARIA
 * radio group: one tab stop, arrows move and select, Home/End jump.
 */
export function SegmentedControl<V extends string>({
  options,
  value,
  onChange,
  label,
  layout = 'fill',
  width,
  className,
}: SegmentedControlProps<V>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (i: number) => {
    const n = options.length;
    const at = (i + n) % n;
    onChange(options[at]!.value);
    refs.current[at]?.focus();
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    const to =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? i + 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? i - 1
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? options.length - 1
              : null;
    if (to === null) return;
    e.preventDefault();
    move(to);
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx(styles.group, className)}
      style={width ? { width } : undefined}
    >
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            className={cx(styles.segment, styles[layout], on && styles.on)}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {o.icon && <Icon name={o.icon} size={16} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
