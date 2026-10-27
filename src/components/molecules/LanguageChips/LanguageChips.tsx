'use client';

import { Fragment, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Chip } from '@/components/atoms/Chip/Chip';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Select } from '@/components/atoms/Select/Select';
import styles from './LanguageChips.module.css';

export type LanguageOption = { id: string; label: string };

type LanguageChipsProps = {
  label: string;
  /** The common languages, as chips in this order. */
  common: LanguageOption[];
  selected: LanguageOption[];
  onToggle: (language: LanguageOption) => void;
  /** Catalog search for "Add another language". */
  query: string;
  onQueryChange: (q: string) => void;
  results: LanguageOption[];
  status: 'loading' | 'error' | 'ready';
  copy: {
    add: string;
    addButton: string;
    cancel: string;
    placeholder: string;
    searching: string;
    searchFailed: string;
    noMatch: (q: string) => string;
  };
  /** `data-ff` key, so a required-field error can focus the group. */
  focusKey?: string;
  /** The common languages didn't load: a line saying so, with Try again. */
  commonFailed?: { text: string; retry: string; onRetry: () => void; at?: number };
  describedBy?: string;
  /** At the limit: chips not picked and the adder are disabled (goal countries: 3). */
  full?: boolean;
  /**
   * A chip after the common ones that stands for "none of these" (goal
   * countries' "Not sure yet"): pressed while nothing is picked, clears the
   * picks, and never disabled by the limit.
   */
  none?: { label: string; onPick: () => void };
};

const MATCHES = 6;
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Languages as chips (Mentee Settings.dc.html `mLangs`): the common ones, then
 * any other the person speaks, each a toggle. "Add another language" opens a
 * field that searches the catalog: the shared Select, searchable, with the
 * matches in its list (design-divergence: the design takes free text, but a
 * language is saved by its catalog id).
 */
export function LanguageChips({
  label,
  common,
  selected,
  onToggle,
  query,
  onQueryChange,
  results,
  status,
  copy,
  focusKey,
  describedBy,
  commonFailed,
  full = false,
  none,
}: LanguageChipsProps) {
  const [adding, setAdding] = useState(false);
  const addButton = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLElement>(null);
  // The row the list last highlighted, for Add. Pressing Add closes the list
  // first (its null arrives before Add's own events), so that null is not
  // taken: typing, Escape and leaving the field forget the row instead.
  const highlight = useRef<string | null>(null);
  const pressed = useRef<string | null>(null);
  const group = useRef<HTMLDivElement>(null);
  // The failure line, heard: put into the always-present region after it
  // mounts (a region that arrives with its text in it is often skipped).
  // Keyed on when it failed, so the same failure after Try again is heard again.
  const failedText = commonFailed?.text ?? null;
  const failedAt = commonFailed?.at ?? 0;
  const [heard, setHeard] = useState<{ text: string; at: number } | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setHeard(failedText ? { text: failedText, at: failedAt } : null));
    return () => clearTimeout(t);
  }, [failedText, failedAt]);
  const isOn = (l: LanguageOption) => selected.some((s) => s.id === l.id);
  const chips = [...common, ...selected.filter((s) => !common.some((c) => c.id === s.id))];
  const typed = query.trim();
  const matches = typed ? results.filter((r) => !isOn(r)).slice(0, MATCHES) : [];
  // Enter with the list closed, and Add with no row highlighted: the match
  // typed in full, else the first.
  const chosen = matches.find((m) => same(m.label, typed)) ?? matches[0];

  // Opened on request, so focus goes straight to the field.
  useEffect(() => {
    if (adding) field.current?.focus();
  }, [adding]);

  // The field and its buttons go: focus returns to "Add another language",
  // or to the group when that pick filled it and the button is now disabled.
  const close = () => {
    setAdding(false);
    onQueryChange('');
    requestAnimationFrame(() => {
      const add = addButton.current;
      if (add && !add.disabled) add.focus();
      else group.current?.focus();
    });
  };
  const pick = (l: LanguageOption | undefined) => {
    if (!l) return;
    // At the limit (a chip filled it while the field was open): nothing more is added.
    if (!isOn(l) && !full) onToggle(l);
    close();
  };
  // The keys the Select leaves alone while its list is closed: Enter adds the
  // match, Escape closes the adder (the one that closes the list stays there).
  const onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented) return;
    if (e.key === 'Enter' && chosen && e.target === field.current) {
      e.preventDefault();
      pick(chosen);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  };

  const noneChip = (n: NonNullable<typeof none>) => (
    <Chip look="choice" pressed={selected.length === 0} onClick={n.onPick}>
      {n.label}
    </Chip>
  );
  return (
    <div
      ref={group}
      data-ff={focusKey}
      tabIndex={-1}
      role="group"
      aria-label={label}
      aria-describedby={describedBy}
      className={styles.group}
    >
      <span role="status" className="sr-only">
        {heard && <span key={heard.at}>{heard.text}</span>}
      </span>
      {commonFailed && (
        <span className={styles.failed}>
          {commonFailed.text}
          <button type="button" className={styles.retry} onClick={commonFailed.onRetry}>
            {commonFailed.retry}
          </button>
        </span>
      )}
      {none && common.length === 0 && noneChip(none)}
      {chips.map((l, i) => (
        <Fragment key={l.id}>
          <Chip
            look="choice"
            pressed={isOn(l)}
            disabled={full && !isOn(l)}
            onClick={() => onToggle(l)}
          >
            {l.label}
          </Chip>
          {none && i === common.length - 1 && noneChip(none)}
        </Fragment>
      ))}
      {!adding ? (
        <button
          ref={addButton}
          type="button"
          className={styles.add}
          disabled={full}
          onClick={() => setAdding(true)}
        >
          <Icon name="add" size={18} />
          {copy.add}
        </button>
      ) : (
        <span
          className={styles.adder}
          onKeyDown={onKey}
          onKeyDownCapture={(e) => e.key === 'Escape' && (highlight.current = null)}
          onBlurCapture={() => (highlight.current = null)}
        >
          <Select
            ref={field}
            searchable
            remote
            density="md"
            text="sm"
            className={styles.search}
            aria-label={copy.add}
            placeholder={copy.placeholder}
            query={query}
            onQueryChange={(q) => {
              highlight.current = null;
              onQueryChange(q);
            }}
            onHighlight={(o) => o && (highlight.current = o.value)}
            value=""
            options={matches.map((m) => ({ value: m.id, label: m.label }))}
            onChange={(e) => pick(matches.find((m) => m.id === e.target.value))}
            status={status}
            copy={{ searching: copy.searching, failed: copy.searchFailed, noMatch: copy.noMatch }}
          />
          <Button
            variant="secondary-outlined"
            size="medium"
            disabled={!chosen}
            onPointerDown={() => (pressed.current = highlight.current)}
            onClick={(e) => {
              // detail 0: Enter or Space on Add, after Tab closed the list.
              const row = e.detail > 0 ? pressed.current : null;
              pressed.current = null;
              pick(matches.find((m) => m.id === row) ?? chosen);
            }}
          >
            {copy.addButton}
          </Button>
          <Button variant="text" size="medium" onClick={close}>
            {copy.cancel}
          </Button>
        </span>
      )}
    </div>
  );
}
