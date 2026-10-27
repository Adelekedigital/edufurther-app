'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { SaveBar } from '@/components/molecules/SaveBar/SaveBar';
import { Snackbar } from '@/components/molecules/Snackbar/Snackbar';
import { MenteeGoalsForm } from '@/components/organisms/MenteeGoalsForm/MenteeGoalsForm';
import { useCountries, useDegreeLevels } from '@/lib/api/data/catalog';
import { savedOriginId, toGoalValues, useMenteeGoals, useSaveGoals } from '@/lib/api/data/goals';
import { useInstitutionSearch } from '@/lib/api/data/mentorApplication';
import { useTopics } from '@/lib/api/data/mentors';
import { HELP_LIMIT } from '@/lib/copy/onboarding';
import {
  GOALS_COPY,
  SAVE_COPY,
  SETTINGS_COPY,
  TAB_LABELS,
  type GoalsGap,
} from '@/lib/copy/settings';
import { focusIfShown } from '@/lib/utils/focus';
import { useLeaveGuard } from '@/lib/utils/leaveGuard';
import { fieldOk } from '@/lib/utils/onboardingAnswers';
import { useRequiredFields } from '@/lib/utils/useRequiredFields';
import type { MenteeGoalValues } from '@/types/settings';
import type { PanelHandle } from './ProfilePanel';
import styles from './GoalsPanel.module.css';

/** How long "Goals saved…" stays (the design's flash: 5s). */
const TOAST_MS = 5000;

const sameList = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x, i) => x === b[i]);
const same = (a: MenteeGoalValues, b: MenteeGoalValues) =>
  a.originId === b.originId &&
  a.degree === b.degree &&
  a.field === b.field &&
  sameList(a.countryIds, b.countryIds) &&
  sameList(a.needIds, b.needIds) &&
  a.schools.length === b.schools.length &&
  a.schools.every(
    (s, i) => s.raw === b.schools[i]!.raw && s.institutionId === b.schools[i]!.institutionId,
  );

/**
 * The four onboarding answers, so a save can never leave a mentee incomplete.
 * No countries is "Not sure yet" (owner, 2026-10-20), and the backend reads
 * it so for matching.
 */
const gapsOf = (v: MenteeGoalValues): GoalsGap[] => [
  ...(v.originId ? [] : ['origin' as const]),
  ...(v.degree ? [] : ['degree' as const]),
  ...(fieldOk(v.field) ? [] : ['field' as const]),
  ...(v.needIds.length ? [] : ['help' as const]),
  ...(v.needIds.length > HELP_LIMIT ? ['helpMax' as const] : []),
];

/**
 * Settings › Goals (Mentee Settings.dc.html `isMGoals`, menteeTabs split,
 * goalsSave=bar): the fields, always open. Any change raises the save bar, as
 * on Profile; Save writes where they're from, then the goal, and says the
 * matches are updated.
 */
export const GoalsPanel = forwardRef<PanelHandle, { userId: string }>(function GoalsPanel(
  { userId },
  ref,
) {
  const { read, status, retry, retrying } = useMenteeGoals(userId);
  const countries = useCountries(true);
  const levels = useDegreeLevels(true);
  const topics = useTopics();
  const saving = useSaveGoals(userId);
  const [schoolQuery, setSchoolQuery] = useState('');
  const schoolSearch = useInstitutionSearch(schoolQuery, countries.countries);

  // `base` is what's saved; `draft` is the form. New server values come in
  // only while there's nothing unsaved (a refetch must not wipe an edit), and
  // only when the server's answer itself changed: the read from before a save
  // must not put the old goal back while the refetch is on its way.
  const [base, setBase] = useState<MenteeGoalValues | null>(null);
  const [draft, setDraft] = useState<MenteeGoalValues | null>(null);
  const [seen, setSeen] = useState<MenteeGoalValues | null>(null);
  const dirty = !!base && !!draft && !same(base, draft);
  const ready = !!read && countries.status === 'ready';
  if (ready) {
    const server = toGoalValues(read, countries.countries);
    if (!seen || (!dirty && !same(seen, server))) {
      setSeen(server);
      setBase(server);
      setDraft(server);
    }
  }

  const [toast, setToast] = useState<string | null>(null);
  // Move on each outcome, so the same words twice are heard again.
  const [toastStamp, setToastStamp] = useState(0);
  const [tries, setTries] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const required = useRequiredFields(draft ? gapsOf(draft) : [], root);
  const heading = useRef<HTMLHeadingElement>(null);
  // Gone before a save answered (the page moved on): nothing more to do.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  // The save bar goes when the form is clean again: focus it held moves to
  // the first card's heading rather than falling to the page (WCAG 2.4.3).
  const keepFocus = () => {
    const at = document.activeElement;
    if (!at || at === document.body || at.closest('[data-save-bar]'))
      requestAnimationFrame(() => focusIfShown(heading.current));
  };

  const discard = () => {
    if (base) setDraft(base);
    required.reset();
    saving.reset();
    setSchoolQuery('');
    keepFocus();
  };

  /**
   * `focus` false for a save asked for from outside (the tab switch, the leave
   * guard): the panel is going away, so focus stays where the dialog puts it.
   */
  const save = async ({ focus = true }: { focus?: boolean } = {}): Promise<boolean> => {
    if (!read || !base || !draft || saving.isPending) return false;
    if (!required.check()) {
      setTries((n) => n + 1);
      return false;
    }
    const after = { ...draft, field: draft.field.trim() };
    try {
      await saving.mutateAsync({
        after,
        savedOriginId: savedOriginId(read, countries.countries),
        goal: read.goal,
        levels: levels.levels,
      });
    } catch {
      if (!alive.current) return false;
      // Even when where they're from landed and only the goal failed, `base`
      // stays: the form is still unsaved, so the bar and its error stay too.
      // The refetch brings the new origin in once the goal saves.
      setTries((n) => n + 1);
      return false;
    }
    if (!alive.current) return true;
    if (focus) keepFocus();
    setBase(after);
    setDraft(after);
    setToast(GOALS_COPY.saved);
    setToastStamp((n) => n + 1);
    return true;
  };

  // The tab-switch guard reads these when asked: rebuilt each render, so current.
  const saveQuietly = () => save({ focus: false });
  useImperativeHandle(ref, () => ({ dirty: () => dirty, save: saveQuietly, discard }));
  useLeaveGuard(dirty, TAB_LABELS.goals, saveQuietly);

  // Error before content, decided by what the view needs: a failed first read
  // of the goal or the countries, or lists the form can't work without (the
  // degree levels to save, the help areas to show) even once the goal is in.
  const listsFailed = levels.status === 'error' || (!!topics.error && topics.topics.length === 0);
  const failed = ((status === 'error' || countries.status === 'error') && !draft) || listsFailed;
  if (failed)
    return (
      <EmptyState
        illustration="forms"
        title={SETTINGS_COPY.loadError}
        description={SETTINGS_COPY.loadErrorBody}
        actions={
          <Button
            variant="secondary-outlined"
            size="large"
            busy={retrying || topics.isLoading}
            onClick={() => {
              retry();
              countries.retry();
              levels.retry();
              topics.retry();
            }}
          >
            {SETTINGS_COPY.retry}
          </Button>
        }
      />
    );
  if (!read || !draft || !base || levels.status !== 'ready' || topics.isLoading)
    return <GoalsSkeleton />;

  return (
    <>
      {/* The panel's own fields: required-field focus never reaches another tab's. */}
      <div ref={root}>
        <MenteeGoalsForm
          headingRef={heading}
          values={draft}
          onChange={(patch) => {
            // A new edit after "Goals saved": the bar comes straight back.
            setToast(null);
            setDraft((d) => (d ? { ...d, ...patch } : d));
          }}
          errors={required.errors}
          countries={countries.countries}
          topics={topics.topics.flatMap((t) =>
            t.id ? [{ id: t.id, slug: t.slug, label: t.label }] : [],
          )}
          schools={{
            query: schoolQuery,
            onQueryChange: setSchoolQuery,
            results: schoolSearch.options.map((o) => ({ id: o.id, name: o.name })),
            status: schoolSearch.isLoading ? 'loading' : schoolSearch.isError ? 'error' : 'ready',
          }}
        />
      </div>
      {dirty && (
        <SaveBar
          label={SAVE_COPY.barLabel}
          message={GOALS_COPY.bar}
          error={required.formError ? SAVE_COPY.formError : (saving.error?.copy ?? null)}
          errorKey={tries}
          discardLabel={SAVE_COPY.discard}
          saveLabel={SAVE_COPY.save}
          savingLabel={SAVE_COPY.saving}
          saving={saving.isPending}
          onDiscard={discard}
          onSave={() => void save()}
        />
      )}
      <Snackbar message={toast} stamp={toastStamp} />
    </>
  );
});

/** The two cards' shapes while /me and the lists load. */
function GoalsSkeleton() {
  return (
    <div className={styles.skeleton} role="status" aria-busy="true" aria-label={GOALS_COPY.loading}>
      <div className={styles.skeletonCard}>
        <Skeleton width="40%" height="16px" />
        <Skeleton width="60%" height="12px" />
        <Skeleton width="100%" height="37px" radius="md" />
        <Skeleton width="70%" height="40px" radius="md" />
        <Skeleton width="100%" height="37px" radius="md" />
        <Skeleton width="80%" height="40px" radius="md" />
      </div>
      <div className={styles.skeletonCard}>
        <Skeleton width="35%" height="16px" />
        <Skeleton width="55%" height="12px" />
        <Skeleton width="100%" height="120px" radius="lg" />
      </div>
    </div>
  );
}
