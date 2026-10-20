'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { GoalSchool } from '@/types/settings';
import { cx } from '@/lib/utils/cx';
import styles from './SchoolChips.module.css';

export type SchoolOption = { id: string; name: string };

type SchoolChipsProps = {
  schools: GoalSchool[];
  onAdd: (school: GoalSchool) => void;
  onRemove: (index: number) => void;
  /** Catalogue search (GET /institutions) on what's typed. */
  query: string;
  onQueryChange: (q: string) => void;
  results: SchoolOption[];
  status: 'loading' | 'error' | 'ready';
  max: number;
  maxChars: number;
  copy: {
    add: string;
    addButton: string;
    remove: (name: string) => string;
    searching: string;
    searchFailed: string;
    full: string;
  };
  /** id of the text that explains the list (its hint). */
  describedBy?: string;
};

const MATCHES = 6;
const key = (s: string) => s.trim().toLowerCase();

/**
 * Schools as removable chips (Mentee Settings.dc.html `gSchools`), with "Add
 * a school" under them. Typing searches the catalogue: arrows and Enter, or a
 * click, pick a match; otherwise the name is kept as typed (the education
 * rule: the server links or queues it). No duplicates; at most `max`.
 */
export function SchoolChips({
  schools,
  onAdd,
  onRemove,
  query,
  onQueryChange,
  results,
  status,
  max,
  maxChars,
  copy,
  describedBy,
}: SchoolChipsProps) {
  const id = useId();
  const listId = `${id}-list`;
  const fullId = `${id}-full`;
  // -1: nothing highlighted, so Enter keeps the typed name unless it is a match's.
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const full = schools.length >= max;
  const typed = query.trim();
  const has = (name: string) =>
    schools.some((s) => key(s.label) === key(name) || key(s.raw) === key(name));
  const matches = typed ? results.filter((r) => !has(r.name)).slice(0, MATCHES) : [];
  const showList = open && typed !== '' && !full && (matches.length > 0 || status !== 'ready');
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  // The removed chip's button is gone: focus the next one, else the field.
  const remove = (i: number) => {
    onRemove(i);
    setTimeout(() => {
      const buttons = wrap.current?.querySelectorAll<HTMLButtonElement>('[data-remove]');
      const next = buttons?.[Math.min(i, buttons.length - 1)];
      (next ?? input.current)?.focus();
    }, 0);
  };

  const done = () => {
    onQueryChange('');
    setActive(-1);
  };
  const add = (pick?: SchoolOption) => {
    if (full) return;
    const exact = matches.find((m) => key(m.name) === key(typed));
    const hit = pick ?? matches[active] ?? exact;
    if (hit) {
      if (!has(hit.name)) onAdd({ institutionId: hit.id, raw: hit.name, label: hit.name });
    } else if (typed && !has(typed)) {
      onAdd({ institutionId: null, raw: typed, label: typed });
    }
    done();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && matches.length) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % matches.length);
    } else if (e.key === 'ArrowUp' && matches.length) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? matches.length - 1 : a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      add();
    } else if (e.key === 'Escape' && showList) {
      e.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div ref={wrap} className={styles.wrap}>
      {schools.length > 0 && (
        <ul className={styles.chips}>
          {schools.map((s, i) => (
            <li key={`${s.institutionId ?? ''}:${s.raw}`} className={styles.chip}>
              <span className={styles.chipLabel}>{s.label}</span>
              <button
                type="button"
                data-remove
                className={styles.remove}
                aria-label={copy.remove(s.label)}
                onClick={() => remove(i)}
              >
                <Icon name="close" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.adder}>
        <span className={styles.search}>
          <input
            ref={input}
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showList && matches[active] ? `${listId}-${active}` : undefined}
            aria-label={copy.add}
            aria-describedby={
              [describedBy, full ? fullId : null].filter(Boolean).join(' ') || undefined
            }
            className={styles.input}
            value={query}
            placeholder={copy.add}
            maxLength={maxChars}
            autoComplete="off"
            // Read-only, not disabled, at the limit: the field keeps focus after
            // the tenth, and says why with the line it describes itself by.
            readOnly={full}
            aria-disabled={full || undefined}
            onChange={(e) => {
              onQueryChange(e.target.value);
              setActive(-1);
              setOpen(true);
            }}
            onKeyDown={onKeyDown}
            onBlur={() => setOpen(false)}
          />
          {showList && (
            <ul id={listId} role="listbox" aria-label={copy.add} className={styles.list}>
              {matches.length === 0 ? (
                <li role="presentation" className={styles.empty}>
                  {status === 'loading' ? copy.searching : copy.searchFailed}
                </li>
              ) : (
                matches.map((m, i) => (
                  <li
                    key={m.id}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    className={cx(styles.option, i === active && styles.activeOption)}
                    // Before the input blurs, so the pick lands.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => add(m)}
                  >
                    {m.name}
                  </li>
                ))
              )}
            </ul>
          )}
        </span>
        <Button
          variant="secondary-outlined"
          size="medium"
          disabled={full || !typed}
          onClick={() => {
            add();
            // The button disables once the field empties: keep focus in the field.
            input.current?.focus();
          }}
        >
          {copy.addButton}
        </Button>
      </div>
      {full && (
        <span id={fullId} className={styles.full}>
          {copy.full}
        </span>
      )}
    </div>
  );
}
