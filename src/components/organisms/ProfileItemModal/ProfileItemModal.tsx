'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import {
  BackgroundFields,
  type BackgroundErrors,
  type BackgroundValues,
} from '@/components/molecules/BackgroundFields/BackgroundFields';
import { AwardFields, type AwardErrors } from '@/components/molecules/AwardFields/AwardFields';
import {
  EducationFields,
  type EducationErrors,
} from '@/components/molecules/EducationFields/EducationFields';
import type { LanguageOption } from '@/components/molecules/LanguagePicker/LanguagePicker';
import { TopicPicker } from '@/components/molecules/TopicPicker/TopicPicker';
import type { TopicGroup } from '@/lib/utils/topicGroups';
import type { AwardValues, EducationValues } from '@/types/mentor';
import styles from './ProfileItemModal.module.css';

export type ItemShell = { title: string; subtitle: string; icon: IconName };

type Common = {
  /** The catalog the form is built from (topics, countries); none for awards. */
  catalog?: { status: 'loading' | 'error' | 'ready'; onRetry: () => void };
  saving: boolean;
  /** Why the last save failed, in our words. */
  error: string | null;
  onClose: () => void;
  /**
   * "Delete {noun}", then "Delete this {noun}? This can’t be undone." with
   * "Keep it" · "Delete {noun}" (design reply #59). Only where it can be deleted.
   */
  remove?: { noun: string; onRemove: () => void; removing: boolean };
  /** The page supplies the frame (ModalShell), as for booking and reviews. */
  renderShell: (shell: ItemShell, body: ReactNode) => ReactNode;
};

type TopicsProps = Common & {
  kind: 'topics';
  groups: TopicGroup[];
  /** Selected topic ids when it opened. */
  initial: string[];
  onSave: (ids: string[]) => void;
};

type BackgroundProps = Common & {
  kind: 'background';
  countries: { id: string; label: string }[];
  languages: {
    results: LanguageOption[];
    query: string;
    onQueryChange: (q: string) => void;
    status: 'loading' | 'error' | 'ready';
    onRetry: () => void;
  };
  initial: BackgroundValues;
  onSave: (values: BackgroundValues) => void;
};

type AwardProps = Common & {
  kind: 'award';
  /** The award being edited; null adds one. */
  initial: AwardValues | null;
  /** The newest year offered, and a new award's default. */
  thisYear: number;
  onSave: (values: AwardValues) => void;
};

type EducationProps = Common & {
  kind: 'education';
  /** Editing a saved degree (its values arrive with the owner's list). */
  editing: boolean;
  /** The degree being edited; null adds one (or while it loads). */
  initial: EducationValues | null;
  thisYear: number;
  /** Another degree is marked current (a new one defaults to current without one). */
  hasOther: boolean;
  onSave: (values: EducationValues) => void;
};

export type ProfileItemModalProps = TopicsProps | BackgroundProps | AwardProps | EducationProps;

const trimEducation = (v: EducationValues): EducationValues => ({
  ...v,
  school: v.school.trim(),
  course: v.course.trim(),
});
const sameEducation = (a: EducationValues, b: EducationValues) =>
  (Object.keys(a) as (keyof EducationValues)[]).every((k) => a[k] === b[k]);

const trimAward = (v: AwardValues): AwardValues => ({
  ...v,
  title: v.title.trim(),
  org: v.org.trim(),
});
const sameAward = (a: AwardValues, b: AwardValues) =>
  a.title === b.title && a.org === b.org && a.year === b.year && a.funding === b.funding;

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

/**
 * The owner's item editor (ProfileItemModal.dc.html): "What you help with"
 * (topics), "Edit background", and adding or editing a degree or an award. Holds the draft; Save checks it first and
 * says what's missing (the design disables Save instead: a disabled button
 * explains nothing, review of #78). Unchanged, Save just closes.
 */
export function ProfileItemModal(props: ProfileItemModalProps) {
  const { saving, error, onClose, remove, renderShell } = props;
  const catalog = props.catalog ?? { status: 'ready' as const, onRetry: () => undefined };
  const [topics, setTopics] = useState<string[]>(props.kind === 'topics' ? props.initial : []);
  const [bg, setBg] = useState<BackgroundValues>(
    props.kind === 'background' ? props.initial : { originId: '', studyId: '', languages: [] },
  );
  const [award, setAward] = useState<AwardValues>(() =>
    props.kind === 'award'
      ? (props.initial ?? { title: '', org: '', year: props.thisYear, funding: null })
      : { title: '', org: '', year: null, funding: null },
  );
  const [edu, setEdu] = useState<EducationValues>(() =>
    props.kind === 'education' && props.initial
      ? props.initial
      : {
          school: '',
          degree: 'PhD',
          course: '',
          start: props.kind === 'education' ? props.thisYear : 0,
          end: props.kind === 'education' ? props.thisYear : 0,
          current: props.kind === 'education' ? !props.hasOther : false,
        },
  );
  // The draft starts from `initial` once the catalog has arrived (it may open
  // loading), and only then: a later refetch can't reset what's been picked.
  // The frame stays mounted throughout (review of #85).
  const [seeded, setSeeded] = useState(catalog.status === 'ready');
  if (!seeded && catalog.status === 'ready') {
    setSeeded(true);
    if (props.kind === 'topics') setTopics(props.initial);
    else if (props.kind === 'background') setBg(props.initial);
    // A new degree is current only when no other is — known once the list is in.
    else if (props.kind === 'education')
      setEdu(props.initial ?? { ...edu, current: !props.hasOther });
  }
  const [problems, setProblems] = useState<
    BackgroundErrors & AwardErrors & EducationErrors & { topics?: string }
  >({});
  const [confirming, setConfirming] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // A failed check: focus the first field it names, so its message is read.
  const problemsKey = Object.values(problems).join('|');
  useEffect(() => {
    if (!problemsKey) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [problemsKey]);

  const ready = catalog.status === 'ready';
  const empty =
    ready &&
    (props.kind === 'topics'
      ? props.groups.length === 0
      : props.kind === 'background' && props.countries.length === 0);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (saving || !ready || empty) return;
    if (props.kind === 'topics') {
      if (topics.length === 0) return setProblems({ topics: 'Pick at least one topic.' });
      setProblems({});
      // After a failed save the server may hold part of it: always send then.
      if (!error && sameSet(topics, props.initial)) return onClose();
      return props.onSave(topics);
    }
    if (props.kind === 'education') {
      const v = trimEducation(edu);
      const next: EducationErrors = {
        ...(!v.school && { school: 'Add your school.' }),
        ...(!v.course && { course: 'Add your course of study.' }),
        ...(v.end < v.start && { end: 'End year can’t be before the start year.' }),
      };
      setProblems(next);
      if (Object.keys(next).length) return;
      if (!error && props.initial && sameEducation(v, trimEducation(props.initial)))
        return onClose();
      return props.onSave(v);
    }
    if (props.kind === 'award') {
      const v = trimAward(award);
      const next: AwardErrors = {
        ...(!v.title && { title: 'Add the award’s name.' }),
        ...(!v.org && { org: 'Add who awarded it.' }),
      };
      setProblems(next);
      if (Object.keys(next).length) return;
      if (!error && props.initial && sameAward(v, trimAward(props.initial))) return onClose();
      return props.onSave(v);
    }
    const next: BackgroundErrors = {
      ...(!bg.originId && { origin: 'Pick where you’re from.' }),
      ...(!bg.studyId && { study: 'Pick where you studied.' }),
      ...(bg.languages.length === 0 && { languages: 'Add a language you mentor in.' }),
    };
    setProblems(next);
    if (Object.keys(next).length) return;
    const init = props.initial;
    if (
      !error &&
      bg.originId === init.originId &&
      bg.studyId === init.studyId &&
      sameSet(
        bg.languages.map((l) => l.id),
        init.languages.map((l) => l.id),
      )
    )
      return onClose();
    props.onSave(bg);
  };

  const shell: ItemShell =
    props.kind === 'education'
      ? {
          title: props.editing ? 'Edit education' : 'Add education',
          icon: 'school',
          subtitle: 'Shown in the Education section of your profile.',
        }
      : props.kind === 'award'
        ? {
            title: props.initial ? 'Edit award' : 'Add an award',
            icon: 'workspace_premium',
            subtitle: 'Shown in the Awards section of your profile.',
          }
        : props.kind === 'topics'
          ? {
              title: 'What you help with',
              icon: 'sell',
              subtitle: `${topics.length} selected · pick the topics you’re strongest in`,
            }
          : {
              title: 'Edit background',
              icon: 'public',
              subtitle: 'Mentees filter by these, so they help the right people find you.',
            };

  const fields =
    catalog.status === 'loading' ? (
      <div className={styles.loading} role="status">
        <span className="sr-only">Loading…</span>
        <Skeleton height="12px" width="40%" />
        <Skeleton height="40px" radius="lg" />
        <Skeleton height="40px" radius="lg" />
      </div>
    ) : catalog.status === 'error' ? (
      <p className={styles.state}>
        {props.kind === 'topics'
          ? 'We couldn’t load the topics.'
          : props.kind === 'education'
            ? 'We couldn’t load your education.'
            : 'We couldn’t load the list of countries.'}{' '}
        <button type="button" className={styles.retry} onClick={catalog.onRetry}>
          Try again
        </button>
      </p>
    ) : empty ? (
      <p className={styles.state}>
        {props.kind === 'topics'
          ? 'There are no topics to choose from right now. Try again later.'
          : 'There are no countries to choose from right now. Try again later.'}
      </p>
    ) : props.kind === 'education' ? (
      <EducationFields
        values={edu}
        onChange={setEdu}
        errors={problems}
        thisYear={props.thisYear}
        hasOther={props.hasOther}
      />
    ) : props.kind === 'award' ? (
      <AwardFields
        values={award}
        onChange={setAward}
        errors={problems}
        thisYear={props.thisYear}
        allowNoYear={!!props.initial && props.initial.year === null}
      />
    ) : props.kind === 'topics' ? (
      <>
        <TopicPicker
          groups={props.groups}
          selected={topics}
          onToggle={(id) =>
            setTopics((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]))
          }
        />
        {problems.topics && (
          <p role="alert" className={styles.error}>
            {problems.topics}
          </p>
        )}
      </>
    ) : (
      <BackgroundFields
        values={bg}
        onChange={setBg}
        countries={props.countries}
        languages={props.languages}
        errors={problems}
      />
    );

  const body = (
    <form ref={formRef} className={styles.form} onSubmit={submit} noValidate>
      {fields}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {remove &&
        (confirming ? (
          <div className={styles.confirm} role="group" aria-label={`Delete this ${remove.noun}?`}>
            <p className={styles.confirmText}>
              <strong>Delete this {remove.noun}?</strong> This can’t be undone.
            </p>
            <div className={styles.confirmActions}>
              <Button
                type="button"
                variant="text"
                size="small"
                onClick={() => setConfirming(false)}
              >
                Keep it
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="small"
                aria-disabled={remove.removing || undefined}
                onClick={() => !remove.removing && remove.onRemove()}
              >
                {remove.removing ? 'Deleting…' : `Delete ${remove.noun}`}
              </Button>
            </div>
          </div>
        ) : (
          <button type="button" className={styles.remove} onClick={() => setConfirming(true)}>
            Delete {remove.noun}
          </button>
        ))}
      <div className={styles.actions}>
        <Button type="button" variant="secondary-outlined" size="large" fullWidth onClick={onClose}>
          Cancel
        </Button>
        {/* aria-disabled, not disabled: a disabled button drops the focus it has. */}
        <Button
          type="submit"
          size="large"
          fullWidth
          aria-disabled={saving || !ready || empty || undefined}
          aria-busy={saving || undefined}
        >
          {saving
            ? 'Saving…'
            : props.kind === 'topics'
              ? 'Save topics'
              : props.kind === 'award' && !props.initial
                ? 'Add award'
                : props.kind === 'education' && !props.editing
                  ? 'Add education'
                  : 'Save changes'}
        </Button>
      </div>
    </form>
  );

  return <>{renderShell(shell, body)}</>;
}
