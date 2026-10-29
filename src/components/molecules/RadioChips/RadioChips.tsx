'use client';

import { useRef, type KeyboardEvent } from 'react';
import { Chip } from '@/components/atoms/Chip/Chip';
import styles from './RadioChips.module.css';

type RadioChipsProps = {
  /** Names the group for assistive tech, e.g. "Applying for". */
  label: string;
  options: { value: string; label: string }[];
  /** The chosen value; '' for none. */
  value: string;
  onChange: (value: string) => void;
  /** id of the text that explains the group (hint, error). */
  describedBy?: string;
  /** `data-ff` key on the tab stop, so a required-field error focuses a choice. */
  focusKey?: string;
  invalid?: boolean;
  /** The chip look: DS choice chips (default) or the dark filter pills (Messages). */
  look?: 'choice' | 'dark';
  /** A choice the form needs (default). A filter isn't one. */
  required?: boolean;
};

const NEXT: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/**
 * One required choice of several, drawn as DS choice chips (Settings › Goals
 * "Applying for"). A radio group: Tab enters at the chosen chip (the first
 * when none), arrows move and choose, Home/End jump to the ends.
 */
export function RadioChips({
  label,
  options,
  value,
  onChange,
  describedBy,
  focusKey,
  invalid,
  look = 'choice',
  required = true,
}: RadioChipsProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const chosen = options.findIndex((o) => o.value === value);
  const stop = chosen === -1 ? 0 : chosen;

  const move = (to: number) => {
    const i = (to + options.length) % options.length;
    onChange(options[i]!.value);
    refs.current[i]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const step = NEXT[e.key];
    if (step !== undefined) move(i + step);
    else if (e.key === 'Home') move(0);
    else if (e.key === 'End') move(options.length - 1);
    else return;
    e.preventDefault();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      aria-required={required || undefined}
      className={styles.row}
    >
      {options.map((o, i) => (
        <Chip
          key={o.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          role="radio"
          look={look}
          pressed={o.value === value}
          tabIndex={i === stop ? 0 : -1}
          data-ff={i === stop ? focusKey : undefined}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          {o.label}
        </Chip>
      ))}
    </div>
  );
}
