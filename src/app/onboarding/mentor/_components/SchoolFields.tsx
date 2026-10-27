'use client';

import { useEffect, useId } from 'react';
import { Chip } from '@/components/atoms/Chip/Chip';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Select } from '@/components/atoms/Select/Select';
import { CountryPicker } from '@/components/molecules/CountryPicker/CountryPicker';
import { SchoolSelect } from '@/components/molecules/SchoolSelect/SchoolSelect';
import type { CatalogOption } from '@/lib/api/data/catalog';
import { useInstitutionSearch } from '@/lib/api/data/mentorApplication';
import { EDUCATION_COPY } from '@/lib/copy/mentorOnboarding';
import { MENTOR_DEGREES, yearOptions } from '@/lib/utils/mentorOnboarding';
import { cx } from '@/lib/utils/cx';
import type { SchoolDraft } from '@/types/mentorOnboarding';
import styles from './EducationStep.module.css';
import step from './steps.module.css';

/** Each control's id, so a gap can move focus to it. */
export const schoolFieldId = (
  key: string,
  f: 'school' | 'country' | 'degree' | 'field' | 'start' | 'end',
) => `mo-${key}-${f}`;

type SchoolFieldsProps = {
  school: SchoolDraft;
  index: number;
  /** More than one school: each is a card with a "School N" head. */
  multi: boolean;
  countries: CatalogOption[];
  fields: string[];
  thisYear: number;
  onChange: (next: SchoolDraft) => void;
  /** Only an added, still-blank school can go (design `canRemove`). */
  onRemove?: () => void;
  onToggleCurrent: () => void;
};

/** One school (design `eduRows`): university, its country, degree, field, years, current. */
export function SchoolFields({
  school: s,
  index,
  multi,
  countries,
  fields,
  thisYear,
  onChange,
  onRemove,
  onToggleCurrent,
}: SchoolFieldsProps) {
  const id = useId();
  const search = useInstitutionSearch(s.school, countries);
  const set = (patch: Partial<SchoolDraft>) => onChange({ ...s, ...patch });
  const typed = s.school.trim();
  const auto = !!s.catalogCountryId && !s.countryOpen;
  // The same rule Continue applies (needsCountry), so a gap always has a field to fill.
  const ask = typed.length > 0 && (!s.catalogCountryId || s.countryOpen);
  const countryName = (cid: string) => countries.find((c) => c.id === cid)?.label ?? '';
  const years = (list: string[]) => [
    { value: '', label: EDUCATION_COPY.yearPlaceholder },
    ...list.map((y) => ({ value: y, label: y })),
  ];
  const fid = (f: Parameters<typeof schoolFieldId>[1]) => schoolFieldId(s.key, f);
  // A name typed in full is matched once the search answers, not only on the keystroke
  // that finished it (the results trail typing by the debounce).
  const exact = s.institutionId
    ? null
    : (search.options.find((o) => o.name.toLowerCase() === typed.toLowerCase()) ?? null);
  useEffect(() => {
    if (exact && !s.countryOpen)
      onChange({ ...s, institutionId: exact.id, catalogCountryId: exact.countryId, countryId: '' });
    // Only when a match appears: `s` and `onChange` change on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exact?.id]);

  return (
    <div className={cx(styles.school, multi && styles.card)}>
      {multi && (
        <div className={styles.head}>
          <span className={styles.headLabel}>{EDUCATION_COPY.schoolN(index + 1)}</span>
          {onRemove && (
            <button
              type="button"
              className={styles.remove}
              aria-label={EDUCATION_COPY.removeSchool(index + 1)}
              onClick={onRemove}
            >
              <Icon name="delete" size={20} />
            </button>
          )}
        </div>
      )}

      <div className={step.field}>
        <label htmlFor={fid('school')} className={step.label}>
          {EDUCATION_COPY.university}
        </label>
        <SchoolSelect
          id={fid('school')}
          density="xl"
          placeholder={EDUCATION_COPY.universityPlaceholder}
          value={{ name: s.school, institutionId: s.institutionId }}
          onChange={({ name, institutionId }, hit) =>
            set({
              school: name,
              institutionId,
              catalogCountryId: hit?.countryId ?? null,
              countryId: '',
              countryOpen: false,
            })
          }
          search={search}
          failedCopy={EDUCATION_COPY.schoolSearchFailed}
        />
      </div>

      {auto && (
        <span className={styles.inCountry}>
          <Icon name="location_on" size={16} className={styles.pin} />
          {EDUCATION_COPY.inCountry(countryName(s.countryId || s.catalogCountryId!))}
          <button
            type="button"
            className={styles.change}
            onClick={() =>
              set({ countryOpen: true, countryId: s.countryId || s.catalogCountryId! })
            }
          >
            {EDUCATION_COPY.change}
          </button>
        </span>
      )}

      {ask && (
        <div className={step.field}>
          <label htmlFor={fid('country')} className={step.label}>
            {EDUCATION_COPY.countryOfStudy}
          </label>
          <CountryPicker
            id={fid('country')}
            aria-describedby={`${id}-country-hint`}
            invalid={false}
            size="xl"
            options={countries}
            value={s.countryId}
            onChange={(countryId) => set({ countryId })}
            placeholder={EDUCATION_COPY.countryPlaceholder}
          />
          <p id={`${id}-country-hint`} className={step.hint}>
            {s.catalogCountryId
              ? EDUCATION_COPY.countryHintKnown
              : EDUCATION_COPY.countryHintUnknown}
          </p>
        </div>
      )}

      <div className={step.field}>
        <span id={`${id}-degree`} className={step.label}>
          {EDUCATION_COPY.degree}
        </span>
        <div role="group" aria-labelledby={`${id}-degree`} className={step.chips}>
          {MENTOR_DEGREES.map((d, i) => (
            <Chip
              key={d.value}
              id={i === 0 ? fid('degree') : undefined}
              look="choice"
              pressed={s.degree === d.value}
              onClick={() => set({ degree: d.value })}
            >
              {d.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className={step.field}>
        <label htmlFor={fid('field')} className={step.label}>
          {EDUCATION_COPY.field}
        </label>
        <Select
          id={fid('field')}
          searchable
          allowCustom
          density="xl"
          maxLength={200}
          placeholder={EDUCATION_COPY.fieldPlaceholder}
          query={s.field}
          onQueryChange={(field) => set({ field })}
          value={s.field}
          options={fields.map((f) => ({ value: f, label: f }))}
          onChange={(e) => set({ field: e.target.value })}
        />
      </div>

      <div className={styles.years}>
        <div className={step.field}>
          <label htmlFor={fid('start')} className={step.label}>
            {EDUCATION_COPY.start}
          </label>
          <Select
            id={fid('start')}
            density="xl"
            options={years(yearOptions('start', thisYear))}
            value={s.start}
            onChange={(e) => {
              const start = e.target.value;
              // An end before the new start no longer fits the end list.
              set({ start, end: s.end && start && +s.end < +start ? '' : s.end });
            }}
          />
        </div>
        <div className={step.field}>
          <label htmlFor={fid('end')} className={step.label}>
            {EDUCATION_COPY.end}
          </label>
          <Select
            id={fid('end')}
            density="xl"
            options={years(yearOptions('end', thisYear, s.start))}
            value={s.end}
            onChange={(e) => set({ end: e.target.value })}
          />
        </div>
      </div>

      <label className={styles.current}>
        <input
          type="checkbox"
          className={styles.box}
          checked={s.current}
          onChange={onToggleCurrent}
        />
        {EDUCATION_COPY.current}
      </label>
    </div>
  );
}
