'use client';

import { useEffect, useState } from 'react';
import { Select } from '@/components/atoms/Select/Select';
import type { InstitutionOption } from '@/lib/api/data/mentorApplication';

/** The catalogue search the page runs on what's typed (useInstitutionSearch). */
export type SchoolSearch = {
  options: InstitutionOption[];
  /** The text `options` answer (trimmed); it trails typing by the debounce. */
  term: string;
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
};

/** What the field holds: the name shown, and the catalogue id once one is picked. */
export type SchoolValue = { name: string; institutionId: string | null };

type SchoolSelectProps = {
  id: string;
  value: SchoolValue;
  /**
   * `hit`: the row the id now points at (picked, or matched once the search
   * answered), null when the id was cleared, undefined when only the text
   * changed (the id is kept until the school is resolved).
   */
  onChange: (next: SchoolValue, hit?: InstitutionOption | null) => void;
  search: SchoolSearch;
  placeholder: string;
  /** Said when the search fails; the typed name can still be kept. */
  failedCopy: string;
  density?: 'default' | 'xl';
  text?: 'xs' | 'sm';
  invalid?: boolean;
  /** Announced as required (aria-required); the form still says what's missing. */
  required?: boolean;
  'aria-describedby'?: string;
};

/** GET /institutions answers from 2 characters. */
const MIN_CHARS = 2;
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * The one school picker (onboarding's University, the education form's
 * School): a search over our list, each row the name with its country, and
 * the typed name kept when it isn't listed.
 *
 * Typing never changes the id on its own: the results may still be the last
 * query's. The id changes when a row is picked, or once the search has
 * answered for what's typed (a listed name gets its id, any other none). The
 * name it opened with, or the row last picked, keeps its id when typed again.
 * Leaving the field before the search answers keeps that id for that name
 * and clears it for any other (the server matches a typed name).
 */
export function SchoolSelect({ value, onChange, search, failedCopy, ...rest }: SchoolSelectProps) {
  // The saved pair (or the last row picked); it follows the value until the field is typed in.
  const [base, setBase] = useState(value);
  const [typing, setTyping] = useState(false);
  if (!typing && (base.name !== value.name || base.institutionId !== value.institutionId))
    setBase(value);

  const typed = value.name.trim();
  // Under 2 characters there's no search to wait for: leaving the field decides.
  const answered =
    typed.length >= MIN_CHARS && !search.isLoading && !search.isError && same(search.term, typed);
  const row = (id: string | null) => search.options.find((o) => o.id === id);
  /** The id for what's typed: undefined while it can't be told yet. */
  const resolve = (settledOnly: boolean): string | null | undefined => {
    if (same(typed, base.name)) return base.institutionId;
    if (answered) return search.options.find((o) => same(o.name, typed))?.id ?? null;
    return settledOnly ? undefined : null;
  };
  const settle = (id: string | null) => {
    if (id === value.institutionId) return;
    onChange({ name: value.name, institutionId: id }, id ? (row(id) ?? undefined) : null);
  };

  const next = typing ? resolve(true) : undefined;
  useEffect(() => {
    if (next !== undefined) settle(next);
    // Only when the answer for what's typed changes: `settle` is new every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next]);

  return (
    <Select
      {...rest}
      searchable
      remote
      minChars={MIN_CHARS}
      allowCustom
      maxLength={200}
      query={value.name}
      onQueryChange={(name) => {
        setTyping(true);
        onChange({ name, institutionId: value.institutionId });
      }}
      onCustom={() => {
        const id = resolve(false);
        if (id !== undefined) settle(id);
      }}
      value={value.institutionId ?? ''}
      options={search.options.map((o) => ({
        value: o.id,
        label: o.name,
        meta: o.countryLabel ?? undefined,
      }))}
      onChange={(e, o) => {
        const picked = { name: o.label, institutionId: e.target.value };
        setTyping(true);
        setBase(picked);
        onChange(picked, row(e.target.value) ?? null);
      }}
      status={search.isLoading ? 'loading' : search.isError ? 'error' : 'ready'}
      onRetry={search.retry}
      copy={{ failed: failedCopy }}
    />
  );
}
