'use client';

import { Select } from '@/components/atoms/Select/Select';
import type { FieldControlProps } from '@/components/molecules/FormField/FormField';

type Option = { id: string; label: string };

type CountryPickerProps = FieldControlProps & {
  options: Option[];
  /** The chosen id; '' for none. */
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  /** xl: 48px flow-form field with a 24px chevron (Mentee Onboarding v5.dc.html). */
  size?: 'default' | 'xl';
  /** `data-ff` key, so a required-field error can focus the field. */
  focusKey?: string;
};

const COPY = {
  noMatch: (q: string) => `No countries match “${q}”.`,
  count: (n: number) => `${n} ${n === 1 ? 'country' : 'countries'}`,
};

/**
 * Type to find a country (product 2026-09-29: about 250 is too long to
 * scroll; the design draws a select, design-divergence.md): the shared
 * Select, searchable. Leaving the field without picking puts the chosen
 * country back.
 */
export function CountryPicker({
  id,
  'aria-describedby': describedBy,
  invalid,
  options,
  value,
  onChange,
  placeholder = 'Search countries',
  size = 'default',
  focusKey,
}: CountryPickerProps) {
  return (
    <Select
      id={id}
      data-ff={focusKey}
      aria-describedby={describedBy}
      invalid={invalid}
      searchable
      text="sm"
      density={size === 'xl' ? 'xl' : 'default'}
      placeholder={placeholder}
      listLabel="Countries"
      copy={COPY}
      value={value}
      options={options.map((o) => ({ value: o.id, label: o.label }))}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
