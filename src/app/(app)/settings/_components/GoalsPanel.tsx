'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { Snackbar } from '@/components/molecules/Snackbar/Snackbar';
import { MenteeGoalsForm } from '@/components/organisms/MenteeGoalsForm/MenteeGoalsForm';
import { SaveChangesDialog } from '@/components/templates/SaveChangesDialog/SaveChangesDialog';
import { useCountries, useDegreeLevels } from '@/lib/api/data/catalog';
import {
  degreeLabel,
  hasGoal,
  savedOriginId,
  toGoalValues,
  useMenteeGoals,
  useSaveGoals,
} from '@/lib/api/data/goals';
import { useInstitutionSearch } from '@/lib/api/data/mentorApplication';
import { useTopics } from '@/lib/api/data/mentors';
import { GOALS_COPY, SETTINGS_COPY, TAB_LABELS, type GoalsGap } from '@/lib/copy/settings';
import { focusIfShown } from '@/lib/utils/focus';
import { useLeaveGuard } from '@/lib/utils/leaveGuard';
import { fieldOk } from '@/lib/utils/onboardingAnswers';
import { useRequiredFields } from '@/lib/utils/useRequiredFields';
import type { MenteeGoalValues } from '@/types/settings';
import type { PanelHandle } from './ProfilePanel';
import styles from './GoalsPanel.module.css';

/** How long "Goals saved…" stays (the design's flash: 5s). */
const TOAST_MS = 5000;

/**
 * Focus once the swap rendered and any dialog that asked (the collapse
 * question) has closed and handed focus back: its opener, the chevron, is
 * gone by then. Waits a few frames at most.
 */
function focusSoon(target: () => HTMLElement | null | undefined, frames = 30) {
  requestAnimationFrame(() => {
    if (document.querySelector('[role="dialog"], [role="alertdialog"]') && frames > 0)
      return focusSoon(target, frames - 1);
    focusIfShown(target());
  });
}

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

/** The four onboarding answers plus a country: a save can never leave a mentee incomplete. */
const gapsOf = (v: MenteeGoalValues): GoalsGap[] => [
  ...(v.originId ? [] : ['origin' as const]),
  ...(v.degree ? [] : ['degree' as const]),
  ...(fieldOk(v.field) ? [] : ['field' as const]),
  ...(v.countryIds.length ? [] : ['countries' as const]),
  ...(v.needIds.length ? [] : ['help' as const]),
];

/**
 * Settings › Goals (Mentee Settings.dc.html `isMGoals`, goalsSave=group):
 * the summary card first when a goal is saved (owner, option a), the fields
 * otherwise. Any change brings Cancel / Save goals; Save writes where they're
 * from, then the goal, and says the matches are updated.
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

  // null: the default, open only when nothing is saved yet.
  const [openPick, setOpenPick] = useState<boolean | null>(null);
  const open = openPick ?? !(read && hasGoal(read));
  const [askCollapse, setAskCollapse] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Move on each outcome, so the same words twice are heard again.
  const [toastStamp, setToastStamp] = useState(0);
  const [tries, setTries] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const required = useRequiredFields(draft ? gapsOf(draft) : [], root);
  const editRef = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  // Focus follows the swap between the card and the fields.
  const focusNext = useRef<'edit' | 'fields' | null>(null);
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

  useEffect(() => {
    const next = focusNext.current;
    focusNext.current = null;
    if (next === 'edit') focusSoon(() => editRef.current);
    if (next === 'fields')
      focusSoon(() => root.current?.querySelector<HTMLElement>('[data-ff="origin"]'));
  }, [open]);

  // The footer goes when the form is clean again and the fields stay (nothing
  // saved yet): focus it held moves to "Your goals", not to the page (WCAG 2.4.3).
  const keepFocus = () => {
    const at = document.activeElement;
    if (!at || at === document.body || at.closest('[data-goals-footer]'))
      focusSoon(() => heading.current);
  };

  /** Back to the card; `focus` false when the panel is about to be hidden (a tab switch). */
  const collapse = (focus = true) => {
    focusNext.current = focus ? 'edit' : null;
    setOpenPick(false);
  };

  const discard = () => {
    if (base) setDraft(base);
    required.reset();
    saving.reset();
    setSchoolQuery('');
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
      // stays: the form is still unsaved, so the footer and its error stay too.
      // The refetch brings the new origin in once the goal saves.
      setTries((n) => n + 1);
      return false;
    }
    if (!alive.current) return true;
    setBase(after);
    setDraft(after);
    setToast(GOALS_COPY.saved);
    setToastStamp((n) => n + 1);
    collapse(focus);
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

  const countryName = (id: string) => countries.countries.find((c) => c.id === id)?.label;
  const summary = {
    title: GOALS_COPY.title(degreeLabel(base.degree), base.field.trim()),
    meta: [
      base.countryIds.flatMap((id) => countryName(id) ?? []).join(', '),
      base.schools.length ? GOALS_COPY.schoolsCount(base.schools.length) : '',
      base.needIds.length ? GOALS_COPY.helpCount(base.needIds.length) : '',
    ]
      .filter(Boolean)
      .join(' · '),
  };

  return (
    <>
      {/* The panel's own fields: required-field focus never reaches another tab's. */}
      <div ref={root}>
        <MenteeGoalsForm
          open={open}
          summary={summary}
          editRef={editRef}
          headingRef={heading}
          onEdit={() => {
            focusNext.current = 'fields';
            setOpenPick(true);
          }}
          onCollapse={() => (dirty ? setAskCollapse(true) : collapse())}
          values={draft}
          onChange={(patch) => {
            // A new edit after "Goals saved": the footer comes straight back.
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
          dirty={dirty}
          saving={saving.isPending}
          formError={required.formError}
          saveError={saving.error?.copy ?? null}
          errorKey={tries}
          onCancel={() => {
            discard();
            // With nothing saved the fields stay: there is no card to go back to.
            if (hasGoal(read)) collapse();
            else keepFocus();
          }}
          onSave={() => void save()}
        />
      </div>
      <Snackbar message={toast} stamp={toastStamp} />
      {askCollapse && (
        <SaveChangesDialog
          where={TAB_LABELS.goals}
          subtitle={GOALS_COPY.collapseSub}
          saving={saving.isPending}
          onKeep={() => setAskCollapse(false)}
          onDiscard={() => {
            setAskCollapse(false);
            discard();
            collapse();
          }}
          onSave={async () => {
            const saved = await save();
            setAskCollapse(false);
            if (!saved) focusNext.current = null;
          }}
        />
      )}
    </>
  );
});

/** The head and the summary card's shape while /me and the lists load. */
function GoalsSkeleton() {
  return (
    <div className={styles.skeleton} role="status" aria-busy="true" aria-label={GOALS_COPY.loading}>
      <div className={styles.skeletonLines}>
        <Skeleton width="120px" height="20px" />
        <Skeleton width="60%" height="12px" />
      </div>
      <div className={styles.skeletonCard}>
        <Skeleton width="40px" height="40px" radius="lg" />
        <div className={styles.skeletonLines}>
          <Skeleton width="45%" height="14px" />
          <Skeleton width="70%" height="12px" />
        </div>
        <Skeleton width="100px" height="var(--button-h-medium)" radius="md" />
      </div>
    </div>
  );
}
