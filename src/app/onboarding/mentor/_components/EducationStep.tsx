'use client';

import { useRef, type Ref } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { FieldError } from '@/components/molecules/FieldError/FieldError';
import type { CatalogOption } from '@/lib/api/data/catalog';
import { EDUCATION_COPY as C, GAP_COPY } from '@/lib/copy/mentorOnboarding';
import { defaultSchool, needsCountry } from '@/lib/utils/mentorOnboarding';
import type { MentorGap, SchoolDraft } from '@/types/mentorOnboarding';
import { SchoolFields, schoolFieldId } from './SchoolFields';
import { StepTitles } from './StepTitles';
import styles from './EducationStep.module.css';
import step from './steps.module.css';

const blank = (s: SchoolDraft) =>
  !s.school.trim() && !s.degree && !s.field.trim() && !s.start && !s.end;

/** The first control a gap points at, in the order the fields show. */
export function firstEducationField(schools: SchoolDraft[], gap: MentorGap): string | null {
  for (const s of schools) {
    if (gap === 'education') {
      if (!s.school.trim()) return schoolFieldId(s.key, 'school');
      if (!s.degree) return schoolFieldId(s.key, 'degree');
      if (!s.field.trim()) return schoolFieldId(s.key, 'field');
      if (!s.start) return schoolFieldId(s.key, 'start');
      if (!s.end) return schoolFieldId(s.key, 'end');
    } else if (needsCountry(s)) {
      return schoolFieldId(s.key, 'country');
    }
  }
  return null;
}

type EducationStepProps = {
  schools: SchoolDraft[];
  onChange: (schools: SchoolDraft[]) => void;
  countries: CatalogOption[];
  fields: string[];
  thisYear: number;
  /** The step's gap once Continue was tapped, else null. */
  error: 'education' | 'studyCountry' | null;
  headingRef: Ref<HTMLHeadingElement>;
};

/** Step 2 (design `showEdu`): one or more schools, most recent first. */
export function EducationStep({
  schools,
  onChange,
  countries,
  fields,
  thisYear,
  error,
  headingRef,
}: EducationStepProps) {
  const multi = schools.length > 1;
  const addRef = useRef<HTMLButtonElement>(null);
  return (
    <section className={step.section}>
      <StepTitles title={C.title} sub={C.sub} headingRef={headingRef} />
      {schools.map((s, i) => (
        <SchoolFields
          key={s.key}
          school={s}
          index={i}
          multi={multi}
          countries={countries}
          fields={fields}
          thisYear={thisYear}
          onChange={(next) => onChange(schools.map((x) => (x.key === s.key ? next : x)))}
          onRemove={
            i > 0 && blank(s)
              ? () => {
                  // The button goes with its school: hand focus on before it does.
                  addRef.current?.focus();
                  onChange(schools.filter((x) => x.key !== s.key));
                }
              : undefined
          }
          onToggleCurrent={() =>
            onChange(schools.map((x) => ({ ...x, current: x.key === s.key ? !s.current : false })))
          }
        />
      ))}
      {error && <FieldError>{GAP_COPY[error]}</FieldError>}
      <button
        ref={addRef}
        type="button"
        className={`${step.textButton} ${styles.add}`}
        onClick={() => onChange([...schools, defaultSchool()])}
      >
        <Icon name="add" size={20} />
        {C.add}
      </button>
    </section>
  );
}
