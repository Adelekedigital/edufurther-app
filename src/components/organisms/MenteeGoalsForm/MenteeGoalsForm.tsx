'use client';

import { useId, useState, type Ref } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Input } from '@/components/atoms/Input/Input';
import { CountryPicker } from '@/components/molecules/CountryPicker/CountryPicker';
import { FieldError } from '@/components/molecules/FieldError/FieldError';
import { GoalSummaryCard } from '@/components/molecules/GoalSummaryCard/GoalSummaryCard';
import {
  LanguageChips,
  type LanguageOption,
} from '@/components/molecules/LanguageChips/LanguageChips';
import { RadioChips } from '@/components/molecules/RadioChips/RadioChips';
import { SchoolChips, type SchoolOption } from '@/components/molecules/SchoolChips/SchoolChips';
import { HelpAreaPicker } from '@/components/organisms/HelpAreaPicker/HelpAreaPicker';
import { DEGREE_OPTIONS, FIELD_MAX, TOP_DESTINATIONS } from '@/lib/copy/onboarding';
import {
  GOAL_COUNTRY_MAX,
  GOAL_SCHOOL_CHARS,
  GOAL_SCHOOL_MAX,
  GOALS_COPY as C,
  GOALS_ERRORS,
  SAVE_COPY,
  type GoalsGap,
} from '@/lib/copy/settings';
import type { TopicOption } from '@/lib/utils/topicGroups';
import type { MenteeGoalValues } from '@/types/settings';
import styles from './MenteeGoalsForm.module.css';

type Option = { id: string; label: string };

export type SchoolSearch = {
  query: string;
  onQueryChange: (q: string) => void;
  results: SchoolOption[];
  status: 'loading' | 'error' | 'ready';
};

type MenteeGoalsFormProps = {
  /** The fields show; closed, the summary card does. */
  open: boolean;
  summary: { title: string; meta: string };
  onEdit: () => void;
  /** The chevron: collapse (the page asks first when there are unsaved changes). */
  onCollapse: () => void;
  /** Edit goals, so focus can come back to it on collapse. */
  editRef?: Ref<HTMLButtonElement>;
  /** "Your goals", where focus goes when the footer it was in goes away. */
  headingRef?: Ref<HTMLHeadingElement>;
  values: MenteeGoalValues;
  onChange: (patch: Partial<MenteeGoalValues>) => void;
  /** Missing required fields, once Save was tried. */
  errors: readonly GoalsGap[];
  /** The full country catalogue. */
  countries: Option[];
  /** The help areas (catalogue service offerings). */
  topics: TopicOption[];
  schools: SchoolSearch;
  /** Unsaved changes: the Cancel / Save goals footer shows. */
  dirty: boolean;
  saving: boolean;
  /** Save was tried with gaps: "Fill in the required fields to continue." */
  formError: boolean;
  /** The save failed, in our words. */
  saveError: string | null;
  /** Moves on every failed Save, so the same line is announced again. */
  errorKey?: number;
  onCancel: () => void;
  onSave: () => void;
};

/** Case- and accent-insensitive, as CountryPicker matches. */
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Settings › Goals for a mentee (Mentee Settings.dc.html `isMGoals`, grouped,
 * collapsed to the summary card): "Your goals", then the summary or the two
 * cards, "What you’re working toward" and "What you need help with", with
 * Cancel / Save goals once something changed. Props only; the page saves.
 */
export function MenteeGoalsForm({
  open,
  summary,
  onEdit,
  onCollapse,
  editRef,
  headingRef,
  values,
  onChange,
  errors,
  countries,
  topics,
  schools,
  dirty,
  saving,
  formError,
  saveError,
  errorKey = 0,
  onCancel,
  onSave,
}: MenteeGoalsFormProps) {
  const id = useId();
  const footerError = formError ? SAVE_COPY.formError : saveError;
  const [countryQuery, setCountryQuery] = useState('');
  const has = (g: GoalsGap) => errors.includes(g);
  const ids = (k: string) => `${id}-${k}`;
  const described = (hint: string | null, g: GoalsGap) =>
    [hint, has(g) ? ids(`${g}-error`) : null].filter(Boolean).join(' ') || undefined;

  const byId = (cid: string) => countries.find((c) => c.id === cid);
  const common = TOP_DESTINATIONS.flatMap((name) => countries.filter((c) => c.label === name));
  const picked = values.countryIds.flatMap((cid) => byId(cid) ?? []);
  const full = values.countryIds.length >= GOAL_COUNTRY_MAX;
  const q = norm(countryQuery.trim());
  const countryResults = q ? countries.filter((c) => norm(c.label).includes(q)) : [];
  const toggleCountry = (c: LanguageOption) => {
    const on = values.countryIds.includes(c.id);
    if (!on && full) return;
    onChange({
      countryIds: on ? values.countryIds.filter((x) => x !== c.id) : [...values.countryIds, c.id],
    });
  };

  return (
    <div className={styles.goals}>
      <div className={styles.head}>
        <div className={styles.headText}>
          <h2 ref={headingRef} tabIndex={-1} className={styles.headTitle}>
            {C.head}
          </h2>
          <span className={styles.headSub}>{C.headSub}</span>
        </div>
        {open && (
          <button
            type="button"
            className={styles.chevron}
            aria-expanded="true"
            aria-label={C.collapse}
            onClick={onCollapse}
          >
            <Icon name="expand_less" size={22} />
          </button>
        )}
      </div>

      {!open ? (
        <GoalSummaryCard
          ref={editRef}
          title={summary.title}
          meta={summary.meta}
          editLabel={C.edit}
          onEdit={onEdit}
        />
      ) : (
        <div className={styles.fields}>
          <section className={styles.card} aria-labelledby={ids('toward')}>
            <div className={styles.cardHead}>
              <h3 id={ids('toward')} className={styles.cardTitle}>
                {C.workingToward}
              </h3>
              <span className={styles.cardSub}>{C.workingTowardSub}</span>
            </div>

            <div className={styles.grid}>
              <div className={styles.field}>
                <label htmlFor={ids('origin')} className={styles.label}>
                  {C.origin}
                </label>
                <CountryPicker
                  id={ids('origin')}
                  focusKey="origin"
                  options={countries}
                  value={values.originId}
                  onChange={(originId) => onChange({ originId })}
                  placeholder={C.originPlaceholder}
                  invalid={has('origin')}
                  aria-describedby={described(null, 'origin')}
                />
                {has('origin') && (
                  <FieldError id={ids('origin-error')}>{GOALS_ERRORS.origin}</FieldError>
                )}
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.labelPair}>
                <span className={styles.label}>{C.applyingFor}</span>
                <span id={ids('degree-hint')} className={styles.hint}>
                  {C.applyingForHint}
                </span>
              </span>
              <RadioChips
                label={C.applyingFor}
                focusKey="degree"
                options={DEGREE_OPTIONS.map((d) => ({ value: d.value, label: d.label }))}
                value={values.degree}
                onChange={(degree) => onChange({ degree })}
                invalid={has('degree')}
                describedBy={described(ids('degree-hint'), 'degree')}
              />
              {has('degree') && (
                <FieldError id={ids('degree-error')}>{GOALS_ERRORS.degree}</FieldError>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor={ids('field')} className={styles.label}>
                {C.field}
              </label>
              <Input
                id={ids('field')}
                data-ff="field"
                autoComplete="off"
                maxLength={FIELD_MAX}
                placeholder={C.fieldPlaceholder}
                value={values.field}
                invalid={has('field')}
                aria-describedby={described(null, 'field')}
                onChange={(e) => onChange({ field: e.target.value })}
              />
              {has('field') && (
                <FieldError id={ids('field-error')}>{GOALS_ERRORS.field}</FieldError>
              )}
            </div>

            <div className={styles.field}>
              <span className={styles.labelPair}>
                <span className={styles.label}>{C.countries}</span>
                <span id={ids('countries-hint')} className={styles.hint}>
                  {C.countriesHint}
                </span>
              </span>
              <LanguageChips
                label={C.countries}
                focusKey="countries"
                common={common}
                selected={picked}
                onToggle={toggleCountry}
                full={full}
                query={countryQuery}
                onQueryChange={setCountryQuery}
                results={countryResults}
                status="ready"
                describedBy={described(ids('countries-hint'), 'countries')}
                copy={{
                  add: C.addCountry,
                  addButton: C.add,
                  cancel: C.cancel,
                  placeholder: C.addCountryPlaceholder,
                  searching: C.searchingCountries,
                  searchFailed: C.countrySearchFailed,
                  noMatch: C.noCountryMatch,
                }}
              />
              {has('countries') && (
                <FieldError id={ids('countries-error')}>{GOALS_ERRORS.countries}</FieldError>
              )}
            </div>

            <div className={styles.field}>
              <span className={styles.labelPairTight}>
                <span className={styles.label}>{C.schools}</span>
                <span id={ids('schools-hint')} className={styles.hintSoft}>
                  {C.schoolsHint}
                </span>
              </span>
              <SchoolChips
                schools={values.schools}
                onAdd={(s) => onChange({ schools: [...values.schools, s] })}
                onRemove={(i) => onChange({ schools: values.schools.filter((_, j) => j !== i) })}
                query={schools.query}
                onQueryChange={schools.onQueryChange}
                results={schools.results}
                status={schools.status}
                max={GOAL_SCHOOL_MAX}
                maxChars={GOAL_SCHOOL_CHARS}
                describedBy={ids('schools-hint')}
                copy={{
                  add: C.addSchool,
                  addButton: C.add,
                  remove: C.removeSchool,
                  searching: C.searchingSchools,
                  searchFailed: C.schoolSearchFailed,
                  full: C.schoolsFull,
                }}
              />
            </div>
          </section>

          <section className={styles.helpCard} aria-labelledby={ids('help')}>
            <div className={styles.cardHead}>
              <h3 id={ids('help')} className={styles.cardTitle}>
                {C.help}
              </h3>
              <span className={styles.cardSub}>{C.helpSub}</span>
            </div>
            {has('help') && <FieldError id={ids('help-error')}>{GOALS_ERRORS.help}</FieldError>}
            <HelpAreaPicker
              look="row"
              focusKey="help"
              label={C.help}
              options={topics}
              value={values.needIds}
              onChange={(needIds) => onChange({ needIds })}
              errorId={has('help') ? ids('help-error') : undefined}
            />
          </section>

          {dirty && (
            <div className={styles.footer} data-goals-footer>
              {/* Always in the footer, so the line is heard when it arrives: a region
                  inserted with its text already in it is often skipped. */}
              <span role="alert" className="sr-only">
                {footerError && <span key={errorKey}>{footerError}</span>}
              </span>
              {footerError && (
                <span aria-hidden className={styles.formError}>
                  {footerError}
                </span>
              )}
              <Button variant="text-secondary" onClick={onCancel} disabled={saving}>
                {C.cancel}
              </Button>
              <Button variant="primary" onClick={onSave} busy={saving}>
                {saving ? C.saving : C.save}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
