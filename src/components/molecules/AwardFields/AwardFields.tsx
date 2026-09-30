import { Input } from '@/components/atoms/Input/Input';
import { Select } from '@/components/atoms/Select/Select';
import { FormField } from '@/components/molecules/FormField/FormField';
import { SegmentedControl } from '@/components/molecules/SegmentedControl/SegmentedControl';
import type { AwardFunding, AwardValues } from '@/types/mentor';
import styles from './AwardFields.module.css';

export type AwardErrors = Partial<Record<'title' | 'org', string>>;

type AwardFieldsProps = {
  values: AwardValues;
  onChange: (next: AwardValues) => void;
  errors?: AwardErrors;
  /** This year: the newest option (the design lists 35 years back from it). */
  thisYear: number;
  /** Offer "No year": only for a saved award that has none, so it isn't made up. */
  allowNoYear?: boolean;
};

const FUNDING: { value: AwardFunding | 'none'; label: string }[] = [
  { value: 'full', label: 'Full' },
  { value: 'partial', label: 'Partial' },
  { value: 'none', label: 'Not shown' },
];

/**
 * An award (ProfileItemModal.dc.html `award`): its name, who awarded it, the
 * year and, optionally, how much it funded. Rendered as siblings, so the
 * modal's own gap spaces the rows as drawn.
 */
export function AwardFields({
  values,
  onChange,
  errors = {},
  thisYear,
  allowNoYear,
}: AwardFieldsProps) {
  const years = Array.from({ length: 35 }, (_, i) => String(thisYear - i));
  const set = <K extends keyof AwardValues>(k: K, v: AwardValues[K]) =>
    onChange({ ...values, [k]: v });
  return (
    <>
      <FormField label="Award name" error={errors.title}>
        {(c) => (
          <Input
            {...c}
            value={values.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. Fulbright Scholarship"
            maxLength={200}
            aria-required
          />
        )}
      </FormField>
      <FormField label="Awarded by" error={errors.org}>
        {(c) => (
          <Input
            {...c}
            value={values.org}
            onChange={(e) => set('org', e.target.value)}
            placeholder="e.g. Stanford University"
            maxLength={200}
            aria-required
          />
        )}
      </FormField>
      <div className={styles.row}>
        <FormField label="Year">
          {(c) => (
            <Select
              {...c}
              className={styles.year}
              options={[
                ...years.map((y) => ({ value: y, label: y })),
                ...(allowNoYear ? [{ value: '', label: 'No year' }] : []),
              ]}
              value={values.year === null ? '' : String(values.year)}
              onChange={(e) => set('year', e.target.value ? Number(e.target.value) : null)}
            />
          )}
        </FormField>
        <div className={styles.funding}>
          <span className={styles.label}>
            Funding<span className={styles.optional}> (optional)</span>
          </span>
          <SegmentedControl
            label="Funding"
            options={FUNDING}
            value={values.funding ?? 'none'}
            onChange={(v) => set('funding', v === 'none' ? null : v)}
          />
        </div>
      </div>
    </>
  );
}
