'use client';

import { useId, useState, type KeyboardEvent } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Chip } from '@/components/atoms/Chip/Chip';
import { Icon } from '@/components/atoms/Icon/Icon';
import { cx } from '@/lib/utils/cx';
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
  commonFailed?: { text: string; retry: string; onRetry: () => void };
  describedBy?: string;
};

const MATCHES = 6;
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Languages as chips (Mentee Settings.dc.html `mLangs`): the common ones, then
 * any other the person speaks, each a toggle. "Add another language" opens a
 * field that searches the catalog, with the matches listed under it
 * (design-divergence: the design takes free text, but a language is saved by
 * its catalog id).
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
}: LanguageChipsProps) {
  const id = useId();
  const listId = `${id}-list`;
  const [adding, setAdding] = useState(false);
  const [active, setActive] = useState(0);
  const isOn = (l: LanguageOption) => selected.some((s) => s.id === l.id);
  const chips = [...common, ...selected.filter((s) => !common.some((c) => c.id === s.id))];
  const typed = query.trim();
  const matches = typed ? results.filter((r) => !isOn(r)).slice(0, MATCHES) : [];
  const exact = matches.find((m) => same(m.label, typed));
  const chosen = matches[active] ?? exact;

  const close = () => {
    setAdding(false);
    setActive(0);
    onQueryChange('');
  };
  const pick = (l: LanguageOption | undefined) => {
    if (!l) return;
    if (!isOn(l)) onToggle(l);
    close();
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && matches.length) {
      e.preventDefault();
      setActive((a) => (a + 1) % matches.length);
    } else if (e.key === 'ArrowUp' && matches.length) {
      e.preventDefault();
      setActive((a) => (a - 1 + matches.length) % matches.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(chosen);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };

  const showList = adding && typed !== '';
  return (
    <div
      data-ff={focusKey}
      tabIndex={-1}
      role="group"
      aria-label={label}
      aria-describedby={describedBy}
      className={styles.group}
    >
      {commonFailed && (
        <span role="alert" className={styles.failed}>
          {commonFailed.text}
          <button type="button" className={styles.retry} onClick={commonFailed.onRetry}>
            {commonFailed.retry}
          </button>
        </span>
      )}
      {chips.map((l) => (
        <Chip key={l.id} look="choice" pressed={isOn(l)} onClick={() => onToggle(l)}>
          {l.label}
        </Chip>
      ))}
      {!adding ? (
        <button type="button" className={styles.add} onClick={() => setAdding(true)}>
          <Icon name="add" size={18} />
          {copy.add}
        </button>
      ) : (
        <span className={styles.adder}>
          <span className={styles.search}>
            <input
              role="combobox"
              aria-expanded={showList}
              aria-controls={showList ? listId : undefined}
              aria-autocomplete="list"
              aria-activedescendant={
                showList && matches[active] ? `${listId}-${active}` : undefined
              }
              aria-label={copy.add}
              className={styles.input}
              value={query}
              placeholder={copy.placeholder}
              // Opened on request, so focus goes straight to it.
              autoFocus
              onChange={(e) => {
                onQueryChange(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKey}
            />
            {showList && (
              <ul id={listId} role="listbox" aria-label={copy.add} className={styles.list}>
                {matches.length === 0 ? (
                  <li role="presentation" className={styles.empty}>
                    {status === 'loading'
                      ? copy.searching
                      : status === 'error'
                        ? copy.searchFailed
                        : copy.noMatch(typed)}
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
                      onClick={() => pick(m)}
                    >
                      {m.label}
                    </li>
                  ))
                )}
              </ul>
            )}
          </span>
          <Button
            variant="secondary-outlined"
            size="medium"
            disabled={!chosen}
            onClick={() => pick(chosen)}
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
