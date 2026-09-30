'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { FieldControlProps } from '@/components/molecules/FormField/FormField';
import { cx } from '@/lib/utils/cx';
import styles from './CountryPicker.module.css';

type Option = { id: string; label: string };

type CountryPickerProps = FieldControlProps & {
  options: Option[];
  /** The chosen id; '' for none. */
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
};

/** Case- and accent-insensitive, so "cote" finds Côte d’Ivoire. */
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Type to find a country (product 2026-09-29: about 250 is too long to
 * scroll; the design draws a select, design-divergence.md). An ARIA 1.2
 * combobox: arrows move through the matches, Enter picks, Escape closes.
 * Leaving the field without picking puts the chosen country back.
 */
export function CountryPicker({
  id,
  'aria-describedby': describedBy,
  invalid,
  options,
  value,
  onChange,
  placeholder = 'Search countries',
}: CountryPickerProps) {
  const listId = useId();
  const chosen = options.find((o) => o.id === value)?.label ?? '';
  const [text, setText] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const query = text ?? '';
  const matches =
    text === null ? options : options.filter((o) => norm(o.label).includes(norm(query.trim())));

  const pick = (o: Option) => {
    onChange(o.id);
    setText(null);
    setOpen(false);
  };
  const show = (i: number) => {
    setActive(i);
    listRef.current?.children[i]?.scrollIntoView?.({ block: 'nearest' });
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return show(
          Math.max(
            0,
            matches.findIndex((o) => o.id === value),
          ),
        );
      }
      const n = matches.length;
      if (n) show((active + (e.key === 'ArrowDown' ? 1 : n - 1)) % n);
    } else if (e.key === 'Enter' && open) {
      // Picks; doesn't submit the form.
      e.preventDefault();
      const o = matches[active];
      if (o) pick(o);
    } else if (e.key === 'Escape' && open) {
      // Closes the list, not the modal.
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      setText(null);
    }
  };

  return (
    <div className={styles.wrap}>
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && matches[active] ? `${listId}-${matches[active].id}` : undefined
        }
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        autoComplete="off"
        className={cx(styles.input, invalid && styles.invalid)}
        placeholder={placeholder}
        value={text ?? chosen}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={(e) => e.target.select()}
        onClick={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setText(null);
        }}
        onKeyDown={onKeyDown}
      />
      <Icon name={open ? 'expand_less' : 'expand_more'} size={18} className={styles.chevron} />
      <ul id={listId} ref={listRef} role="listbox" className={styles.list} hidden={!open}>
        {matches.length === 0 ? (
          <li className={styles.none}>No countries match “{query.trim()}”.</li>
        ) : (
          matches.map((o, i) => (
            <li
              key={o.id}
              id={`${listId}-${o.id}`}
              role="option"
              aria-selected={o.id === value}
              className={cx(styles.option, i === active && styles.active)}
              // Before the input's blur, so the pick lands.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(o);
              }}
            >
              {o.label}
              {o.id === value && <Icon name="check" size={16} className={styles.tick} />}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
