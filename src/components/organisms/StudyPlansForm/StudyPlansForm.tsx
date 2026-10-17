'use client';

import { useId, type ReactNode } from 'react';
import { Input } from '@/components/atoms/Input/Input';
import { Select } from '@/components/atoms/Select/Select';
import { CountryPicker } from '@/components/molecules/CountryPicker/CountryPicker';
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
} from '@/lib/copy/onboarding';
import type { PlanAnswers } from '@/types/onboarding';
import { cx } from '@/lib/utils/cx';
import styles from './StudyPlansForm.module.css';

type CatalogOption = { id: string; label: string };

type StudyPlansFormProps = {
  /** The full country catalog (`/catalog/countries`). */
  countries: CatalogOption[];
  value: PlanAnswers;
  onChange: (next: PlanAnswers) => void;
};

/** The design's 8 first, then "Not sure yet", then the rest of the catalog (PRD H8). */
function destinationOptions(countries: CatalogOption[]): CatalogOption[] {
  const top = TOP_DESTINATIONS.flatMap((name) => countries.filter((c) => c.label === name));
  const rest = countries.filter((c) => !top.includes(c));
  return [...top, { id: NOT_SURE, label: NOT_SURE_LABEL }, ...rest];
}

function Field({
  label,
  hint,
  wide,
  children,
}: {
  label: string;
  hint: string;
  /** The destination hint runs two lines on phones: the design gives it the paragraph leading. */
  wide?: boolean;
  children: (ids: { id: string; hintId: string }) => ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children({ id, hintId })}
      <p id={hintId} className={cx(styles.hint, wide && styles.hintWide)}>
        {hint}
      </p>
    </div>
  );
}

/**
 * Step 2, "Tell us about your study plans" (Mentee Onboarding v5.dc.html,
 * `planFields=search`). One answer each. The two country questions use
 * CountryPicker over the full catalog instead of the design's short lists,
 * because the profile stores a country id (PRD deviation table).
 */
export function StudyPlansForm({ countries, value, onChange }: StudyPlansFormProps) {
  const listId = useId();
  const set = (patch: Partial<PlanAnswers>) => onChange({ ...value, ...patch });
  return (
    <div className={styles.form}>
      <Field label={PLAN_LABELS.origin} hint={PLAN_HINTS.origin}>
        {({ id, hintId }) => (
          <CountryPicker
            id={id}
            aria-describedby={hintId}
            invalid={false}
            size="xl"
            options={countries}
            value={value.originId}
            onChange={(originId) => set({ originId })}
            placeholder={PLAN_PLACEHOLDERS.origin}
          />
        )}
      </Field>
      <Field label={PLAN_LABELS.degree} hint={PLAN_HINTS.degree}>
        {({ id, hintId }) => (
          <Select
            id={id}
            aria-describedby={hintId}
            density="xl"
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
      <Field label={PLAN_LABELS.field} hint={PLAN_HINTS.field}>
        {({ id, hintId }) => (
          <>
            <Input
              id={id}
              aria-describedby={hintId}
              fieldSize="xl"
              list={listId}
              maxLength={FIELD_MAX}
              autoComplete="off"
              placeholder={PLAN_PLACEHOLDERS.field}
              value={value.field}
              onChange={(e) => set({ field: e.target.value })}
            />
            <datalist id={listId}>
              {FIELD_SUGGESTIONS.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </>
        )}
      </Field>
      <Field label={PLAN_LABELS.destination} hint={PLAN_HINTS.destination} wide>
        {({ id, hintId }) => (
          <CountryPicker
            id={id}
            aria-describedby={hintId}
            invalid={false}
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
