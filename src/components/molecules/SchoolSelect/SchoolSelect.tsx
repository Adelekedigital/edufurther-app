'use client';

import { Select } from '@/components/atoms/Select/Select';
import type { InstitutionOption } from '@/lib/api/data/mentorApplication';

/** The catalogue search the page runs on what's typed (useInstitutionSearch). */
export type SchoolSearch = {
  options: InstitutionOption[];
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
};

/** What the field holds: the name shown, and the catalogue id once one is picked. */
export type SchoolValue = { name: string; institutionId: string | null };

type SchoolSelectProps = {
  id: string;
  value: SchoolValue;
  /** `hit`: the catalogue row picked or typed in full, else null (a typed name). */
  onChange: (next: SchoolValue, hit: InstitutionOption | null) => void;
  search: SchoolSearch;
  placeholder: string;
  /** Said when the search fails; the typed name can still be kept. */
  failedCopy: string;
  density?: 'default' | 'xl';
  text?: 'xs' | 'sm';
  invalid?: boolean;
  'aria-describedby'?: string;
};

/**
 * The one school picker (onboarding's University, the education form's
 * School): a search over our list, each row the name with its country, and
 * the typed name kept when it isn't listed. Picking keeps the row's id;
 * typing clears it, unless the name typed in full is a listed one.
 */
export function SchoolSelect({ value, onChange, search, failedCopy, ...rest }: SchoolSelectProps) {
  return (
    <Select
      {...rest}
      searchable
      remote
      // GET /institutions answers from 2 characters: shorter shows no list.
      minChars={2}
      allowCustom
      maxLength={200}
      query={value.name}
      onQueryChange={(name) => {
        const typed = name.trim().toLowerCase();
        const hit = search.options.find((o) => o.name.toLowerCase() === typed) ?? null;
        onChange({ name, institutionId: hit?.id ?? null }, hit);
      }}
      value={value.institutionId ?? ''}
      options={search.options.map((o) => ({
        value: o.id,
        label: o.name,
        meta: o.countryLabel ?? undefined,
      }))}
      onChange={(e, o) => {
        const hit = search.options.find((x) => x.id === e.target.value) ?? null;
        onChange({ name: o.label, institutionId: e.target.value }, hit);
      }}
      status={search.isLoading ? 'loading' : search.isError ? 'error' : 'ready'}
      onRetry={search.retry}
      copy={{ failed: failedCopy }}
    />
  );
}
