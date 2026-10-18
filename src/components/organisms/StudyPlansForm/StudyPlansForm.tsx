'use client';

import { useId, type ReactNode } from 'react';
import { Input } from '@/components/atoms/Input/Input';
import { Select } from '@/components/atoms/Select/Select';
import { CountryPicker } from '@/components/molecules/CountryPicker/CountryPicker';
import { FieldError } from '@/components/molecules/FieldError/FieldError';
import {
  DEGREE_OPTIONS,
  FIELD_MAX,
  FIELD_SUGGESTIONS,
  NOT_SURE,
  NOT_SURE_LABEL,
  PLAN_HINTS,
  PLAN_LABELS,
  PLAN_PLACEHOLDERS,
  TOP_DESTINATIONS,
  type MissingKey,
} from '@/lib/copy/onboarding';
import type { PlanAnswers } from '@/types/onboarding';
import { cx } from '@/lib/utils/cx';
import styles from './StudyPlansForm.module.css';

type CatalogOption = { id: string; label: string };

type StudyPlansFormProps = {
  /** The full country catalog (`/catalog/countries`). */
  countries: CatalogOption[];
  /** Field-of-study suggestions (`/catalog/fields-of-study`); the short built-in list until they load. */
  fields?: string[] | null;
  value: PlanAnswers;
  onChange: (next: PlanAnswers) => void;
  /** The line under each answer still missing (only once Continue was pressed). */
  errors?: Partial<Record<PlanKey, string>>;
  /** Field ids are `${idPrefix}-origin` etc., so the page can move focus to the first gap. */
  idPrefix?: string;
};

export type PlanKey = Exclude<MissingKey, 'help'>;

/** The design's 8 first, then "Not sure yet", then the rest of the catalog (PRD H8). */
function destinationOptions(countries: CatalogOption[]): CatalogOption[] {
  const top = TOP_DESTINATIONS.flatMap((name) => countries.filter((c) => c.label === name));
  const rest = countries.filter((c) => !top.includes(c));
  return [...top, { id: NOT_SURE, label: NOT_SURE_LABEL }, ...rest];
}

function Field({
  id,
  label,
  hint,
  error,
  wide,
  children,
}: {
  id: string;
  label: string;
  hint: string;
  error?: string;
  /** The destination hint runs two lines on phones: the design gives it the paragraph leading. */
  wide?: boolean;
  children: (a: { id: string; describedBy: string; invalid: boolean }) => ReactNode;
}) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children({ id, describedBy: error ? `${hintId} ${errorId}` : hintId, invalid: !!error })}
      <p id={hintId} className={cx(styles.hint, wide && styles.hintWide)}>
        {hint}
      </p>
      {/* Under the hint, as drawn (Mentee Onboarding v5.dc.html `errOrigin` and the rest). */}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}

/**
 * Step 2, "Tell us about your study plans" (Mentee Onboarding v5.dc.html,
 * `planFields=search`). One answer each. The two country questions use
 * CountryPicker over the full catalog instead of the design's short lists,
 * because the profile stores a country id (PRD deviation table).
 */
export function StudyPlansForm({
  countries,
  fields,
  value,
  onChange,
  errors = {},
  idPrefix,
}: StudyPlansFormProps) {
  const own = useId();
  const pre = idPrefix ?? own;
  const listId = `${pre}-fields`;
  const set = (patch: Partial<PlanAnswers>) => onChange({ ...value, ...patch });
  return (
    <div className={styles.form}>
      <Field
        id={`${pre}-origin`}
        label={PLAN_LABELS.origin}
        hint={PLAN_HINTS.origin}
        error={errors.origin}
      >
        {({ id, describedBy, invalid }) => (
          <CountryPicker
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            size="xl"
            options={countries}
            value={value.originId}
            onChange={(originId) => set({ originId })}
            placeholder={PLAN_PLACEHOLDERS.origin}
          />
        )}
      </Field>
      <Field
        id={`${pre}-degree`}
        label={PLAN_LABELS.degree}
        hint={PLAN_HINTS.degree}
        error={errors.degree}
      >
        {({ id, describedBy, invalid }) => (
          <Select
            id={id}
            aria-describedby={describedBy}
            density="xl"
            invalid={invalid}
            className={styles.select}
            value={value.degree}
            onChange={(e) => set({ degree: e.target.value })}
            options={[
              { value: '', label: PLAN_PLACEHOLDERS.degree },
              ...DEGREE_OPTIONS.map((d) => ({ value: d.value, label: d.label })),
            ]}
          />
        )}
      </Field>
      <Field
        id={`${pre}-field`}
        label={PLAN_LABELS.field}
        hint={PLAN_HINTS.field}
        error={errors.field}
      >
        {({ id, describedBy, invalid }) => (
          <>
            <Input
              id={id}
              aria-describedby={describedBy}
              fieldSize="xl"
              invalid={invalid}
              list={listId}
              maxLength={FIELD_MAX}
              autoComplete="off"
              placeholder={PLAN_PLACEHOLDERS.field}
              value={value.field}
              onChange={(e) => set({ field: e.target.value })}
            />
            <datalist id={listId}>
              {(fields ?? FIELD_SUGGESTIONS).map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </>
        )}
      </Field>
      <Field
        id={`${pre}-destination`}
        label={PLAN_LABELS.destination}
        hint={PLAN_HINTS.destination}
        error={errors.destination}
        wide
      >
        {({ id, describedBy, invalid }) => (
          <CountryPicker
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            size="xl"
            options={destinationOptions(countries)}
            value={value.destinationId}
            onChange={(destinationId) => set({ destinationId })}
            placeholder={PLAN_PLACEHOLDERS.destination}
          />
        )}
      </Field>
    </div>
  );
}
