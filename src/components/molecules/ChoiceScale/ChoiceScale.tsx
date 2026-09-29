'use client';

import { useId, useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { cx } from '@/lib/utils/cx';
import styles from './ChoiceScale.module.css';

export type ScaleOption<V extends string | number> = {
  value: V;
  label: string;
  icon?: IconName;
  /** The icon's colour while not chosen (white once chosen). */
  tint?: 'danger' | 'warning' | 'success';
};

type ChoiceScaleProps<V extends string | number> = {
  options: ScaleOption<V>[];
  value: V | null;
  onChange: (value: V) => void;
  /** Names the group: the question it answers (used when there's no `labelledBy`). */
  label: string;
  /** The id of the visible question: preferred over `label`. */
  labelledBy?: string;
  /** Tight: the 1–10 scale's 4px gaps. */
  tight?: boolean;
  /** Label weight: medium for words, semibold for numbers (design). */
  numeric?: boolean;
  /** "Not at all" · "A lot" under the ends. */
  ends?: [string, string];
};

/**
 * ReviewModal.dc.html's answer rows: separate 44px buttons in equal columns,
 * outlined until chosen, then filled blue. A WAI-ARIA radio group (one tab
 * stop, arrows move and choose). Not SegmentedControl: that one is a single
 * joined control with shared borders.
 */
export function ChoiceScale<V extends string | number>({
  options,
  value,
  onChange,
  label,
  tight,
  numeric,
  ends,
  labelledBy,
}: ChoiceScaleProps<V>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const endsId = useId();
  const at = options.findIndex((o) => o.value === value);
  const focusable = at < 0 ? 0 : at;
  const move = (i: number) => {
    const n = (i + options.length) % options.length;
    onChange(options[n]!.value);
    refs.current[n]?.focus();
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') move(i + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') move(i - 1);
    else if (e.key === 'Home') move(0);
    else if (e.key === 'End') move(options.length - 1);
    else return;
    e.preventDefault();
  };
  return (
    <div className={styles.wrap}>
      <div
        role="radiogroup"
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        aria-describedby={ends ? endsId : undefined}
        className={cx(styles.grid, tight && styles.tight)}
        style={{ '--cols': options.length } as CSSProperties}
      >
        {options.map((o, i) => {
          const on = o.value === value;
          return (
            <button
              key={String(o.value)}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={i === focusable ? 0 : -1}
              className={cx(styles.option, numeric && styles.numeric, on && styles.on)}
              onClick={() => onChange(o.value)}
              onKeyDown={(e) => onKey(e, i)}
            >
              {o.icon && (
                <Icon
                  name={o.icon}
                  size={20}
                  className={on ? undefined : styles[o.tint ?? 'plain']}
                />
              )}
              {o.label}
            </button>
          );
        })}
      </div>
      {ends && (
        // Describes the group ("Not at all … A lot") so the numbers have a meaning.
        <div className={styles.ends} id={endsId}>
          <span>{ends[0]}</span>
          <span>{ends[1]}</span>
        </div>
      )}
    </div>
  );
}
