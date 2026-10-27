'use client';

import { useId, useRef } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Select } from '@/components/atoms/Select/Select';
import { useHighlightOnPress } from '@/lib/utils/useHighlightOnPress';
import type { GoalSchool } from '@/types/settings';
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
 * a school" under them: the shared Select, searchable. Typing searches the
 * catalogue: arrows and Enter, or a click, pick a match; otherwise Enter keeps
 * the name as typed (the education rule: the server links or queues it). No
 * duplicates; at most `max`.
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
  const fullId = `${id}-full`;
  const full = schools.length >= max;
  const typed = query.trim();
  const has = (name: string) =>
    schools.some((s) => key(s.label) === key(name) || key(s.raw) === key(name));
  const matches = typed && !full ? results.filter((r) => !has(r.name)).slice(0, MATCHES) : [];
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLElement>(null);
  // The Select also keeps typed text when focus or a press leaves the field.
  // Here that would add a chip nobody asked for (and eat the Add button's
  // click), so only Enter or the Use row adds it.
  const asked = useRef(false);

  const addButton = useRef<HTMLButtonElement>(null);
  const highlighted = useHighlightOnPress(input, addButton);

  // The removed chip's button is gone: focus the next one, else the field.
  const remove = (i: number) => {
    onRemove(i);
    setTimeout(() => {
      const buttons = wrap.current?.querySelectorAll<HTMLButtonElement>('[data-remove]');
      const next = buttons?.[Math.min(i, buttons.length - 1)];
      (next ?? input.current)?.focus();
    }, 0);
  };

  const add = (pick?: SchoolOption) => {
    if (full) return;
    const hit = pick ?? matches.find((m) => key(m.name) === key(typed));
    if (hit) {
      if (!has(hit.name)) onAdd({ institutionId: hit.id, raw: hit.name, label: hit.name });
    } else if (typed && !has(typed)) {
      onAdd({ institutionId: null, raw: typed, label: typed });
    }
    onQueryChange('');
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
      <div
        className={styles.adder}
        onKeyDownCapture={(e) => (asked.current = e.key === 'Enter')}
        onPointerDownCapture={(e) =>
          (asked.current = e.target instanceof Element && !!e.target.closest('[role="option"]'))
        }
        onBlurCapture={() => (asked.current = false)}
        // Enter with the list closed (after Escape), which the Select leaves alone.
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || e.defaultPrevented || e.target !== input.current) return;
          e.preventDefault();
          add();
        }}
      >
        <Select
          ref={input}
          searchable
          remote
          density="md"
          // GET /institutions runs from two characters (useInstitutionSearch).
          minChars={2}
          allowCustom
          text="sm"
          className={styles.search}
          aria-label={copy.add}
          aria-describedby={
            [describedBy, full ? fullId : null].filter(Boolean).join(' ') || undefined
          }
          placeholder={copy.add}
          maxLength={maxChars}
          // Read-only, not disabled, at the limit: the field keeps focus after
          // the tenth, and says why with the line it describes itself by.
          readOnly={full}
          query={query}
          onQueryChange={onQueryChange}
          value=""
          options={matches.map((m) => ({ value: m.id, label: m.name }))}
          onChange={(e) => add(matches.find((m) => m.id === e.target.value))}
          onCustom={() => {
            if (asked.current) add();
          }}
          status={status}
          copy={{ searching: copy.searching, failed: copy.searchFailed }}
        />
        <Button
          ref={addButton}
          variant="secondary-outlined"
          size="medium"
          disabled={full || !typed}
          onClick={(e) => {
            const row = highlighted(e);
            add(matches.find((m) => m.id === row));
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
