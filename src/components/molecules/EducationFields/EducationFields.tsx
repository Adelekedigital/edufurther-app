import { useId } from 'react';
import { Input } from '@/components/atoms/Input/Input';
import { Select } from '@/components/atoms/Select/Select';
import { FormField } from '@/components/molecules/FormField/FormField';
import { SchoolSelect, type SchoolSearch } from '@/components/molecules/SchoolSelect/SchoolSelect';
import { EDUCATION_FIELD_COPY, type EducationAudience } from '@/lib/copy/education';
import { DEGREES } from '@/lib/utils/degrees';
import { cx } from '@/lib/utils/cx';
import type { EducationValues } from '@/types/mentor';
import styles from './EducationFields.module.css';

export type EducationErrors = Partial<Record<'school' | 'course' | 'end', string>>;

/** The school search, run by the page on what's typed into School. */
export type SchoolSearchProps = SchoolSearch & { onQueryChange: (q: string) => void };

type EducationFieldsProps = {
  values: EducationValues;
  onChange: (next: EducationValues) => void;
  errors?: EducationErrors;
  /** The newest year offered (the design lists 40 years back from five ahead). */
  thisYear: number;
  /** Another degree is marked current: ticking this one replaces it. */
  hasOther: boolean;
  /** Who is editing: only a mentor has a mentor card to mention. */
  audience: EducationAudience;
  schools: SchoolSearchProps;
};

/**
 * A degree (ProfileItemModal.dc.html `education`): school; degree and course;
 * start and end years; and whether it's the current or most recent one.
 * Rendered as siblings, so the modal's own gap spaces the rows as drawn.
 */
export function EducationFields({
  values,
  onChange,
  errors = {},
  thisYear,
  hasOther,
  audience,
  schools,
}: EducationFieldsProps) {
  const hintId = useId();
  // The design's 40 years, plus a saved year outside them (review of #93), newest first.
  const years = [
    ...new Set([
      ...Array.from({ length: 40 }, (_, i) => thisYear + 5 - i),
      values.start,
      values.end,
    ]),
  ].sort((a, b) => b - a);
  const yearOptions = years.map((y) => ({ value: String(y), label: String(y) }));
  // A saved abbreviation the list doesn't offer (e.g. LLM) stays pickable.
  const degrees = [
    ...((DEGREES as readonly string[]).includes(values.degree) ? [] : [values.degree]),
    ...DEGREES,
  ].map((d) => ({ value: d, label: d }));
  const set = <K extends keyof EducationValues>(k: K, v: EducationValues[K]) =>
    onChange({ ...values, [k]: v });
  const cur = values.current;
  return (
    <>
      <FormField label="School" error={errors.school}>
        {(c) => (
          <SchoolSelect
            {...c}
            text="sm"
            placeholder="e.g. Mississippi State University"
            value={{ name: values.school, institutionId: values.institutionId }}
            onChange={({ name, institutionId }) => {
              onChange({ ...values, school: name, institutionId });
              schools.onQueryChange(name);
            }}
            search={schools}
            failedCopy={EDUCATION_FIELD_COPY.schoolSearchFailed}
          />
        )}
      </FormField>
      <div className={styles.degreeRow}>
        <FormField label="Degree">
          {(c) => (
            <Select
              {...c}
              text="sm"
              options={degrees}
              value={values.degree}
              onChange={(e) => set('degree', e.target.value)}
            />
          )}
        </FormField>
        <FormField label="Course of study" error={errors.course}>
          {(c) => (
            <Input
              {...c}
              value={values.course}
              onChange={(e) => set('course', e.target.value)}
              placeholder="e.g. Sociology"
              maxLength={200}
              aria-required
            />
          )}
        </FormField>
      </div>
      <div className={styles.yearRow}>
        <FormField label="Start year">
          {(c) => (
            <Select
              {...c}
              text="sm"
              options={yearOptions}
              value={String(values.start)}
              onChange={(e) => set('start', Number(e.target.value))}
            />
          )}
        </FormField>
        <FormField label="End year (or expected)" error={errors.end}>
          {(c) => (
            <Select
              {...c}
              text="sm"
              options={yearOptions}
              value={String(values.end)}
              onChange={(e) => set('end', Number(e.target.value))}
            />
          )}
        </FormField>
      </div>
      <label className={cx(styles.current, cur && styles.on)}>
        <input
          type="checkbox"
          className={styles.box}
          checked={cur}
          onChange={(e) => set('current', e.target.checked)}
          // Named by the title alone; the hint below is its description.
          aria-labelledby={`${hintId}-title`}
          aria-describedby={hintId}
        />
        <span className={styles.currentText}>
          <span id={`${hintId}-title`} className={styles.currentTitle}>
            This is my current or most recent education
          </span>
          <span id={hintId} className={styles.currentHint}>
            {cur
              ? EDUCATION_FIELD_COPY.currentHint[audience] +
                (hasOther ? EDUCATION_FIELD_COPY.replaces : '')
              : EDUCATION_FIELD_COPY.unticked}
          </span>
        </span>
      </label>
    </>
  );
}
