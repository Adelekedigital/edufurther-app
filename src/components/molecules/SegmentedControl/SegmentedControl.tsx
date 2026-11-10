'use client';

import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import styles from './SegmentedControl.module.css';

export type Segment<V extends string> = {
  value: V;
  label: string;
  icon?: IconName;
  /** Only the icon shows; the label names it (aria-label and title). Needs `icon`. */
  iconOnly?: boolean;
};

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
  /**
   * outline: bordered segments, the pick filled blue (Session Types.dc.html).
   * track: a grey track, the pick a white raised segment (PerformanceChart.dc.html,
   * Admin Analytics.dc.html).
   */
  look?: 'outline' | 'track';
  /**
   * Track only: sm 28px (PerformanceChart, segments touch), md 32px (Admin
   * Analytics' toggles), lg 36px (Admin Analytics' time window).
   */
  size?: 'sm' | 'md' | 'lg';
  /** Track only: a control sharing the track after the radios (PerformanceChart's year Select). */
  trailing?: ReactNode;
  /** Width of the whole control; the design draws Price at 200px. */
  width?: number;
  className?: string;
  /**
   * Shown but fixed (the help-area question's type, set by its source): it
   * stays reachable and says it's unavailable; choosing does nothing.
   */
  disabled?: boolean;
};

/**
 * Segmented radio group (Session Types.dc.html Price, Answer type;
 * PerformanceChart and Admin Analytics on the grey track). WAI-ARIA radio
 * group: one tab stop, arrows move and select, Home/End jump.
 */
export function SegmentedControl<V extends string>({
  options,
  value,
  onChange,
  label,
  layout = 'fill',
  look = 'outline',
  size = 'md',
  trailing,
  width,
  className,
  disabled,
}: SegmentedControlProps<V>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const track = look === 'track';
  // Nothing selected (or a value that isn't offered): the first segment takes
  // the tab stop, so the group is still reachable by keyboard.
  const stop = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const move = (i: number) => {
    if (disabled) return;
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
  const group = (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={
        track
          ? cx(styles.radios, layout === 'fill' && styles.radiosFill)
          : cx(styles.group, className)
      }
      style={!track && width ? { width } : undefined}
    >
      {options.map((o, i) => {
        const on = o.value === value;
        const iconOnly = !!(o.iconOnly && o.icon);
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={iconOnly ? o.label : undefined}
            title={iconOnly ? o.label : undefined}
            tabIndex={i === stop ? 0 : -1}
            className={
              track
                ? cx(
                    styles.tseg,
                    layout === 'fill' && styles.tsegFill,
                    iconOnly && styles.iconOnly,
                    on && styles.ton,
                  )
                : cx(styles.segment, styles[layout], on && styles.on)
            }
            onClick={() => !disabled && onChange(o.value)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {o.icon && <Icon name={o.icon} size={iconOnly ? 18 : 16} />}
            {!iconOnly && o.label}
          </button>
        );
      })}
    </div>
  );
  if (!track) return group;
  return (
    <div
      className={cx(styles.track, styles[size], className)}
      style={width ? { width } : undefined}
    >
      {group}
      {trailing}
    </div>
  );
}
