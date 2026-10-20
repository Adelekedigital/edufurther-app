'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { SaveBar } from '@/components/molecules/SaveBar/SaveBar';
import { Snackbar } from '@/components/molecules/Snackbar/Snackbar';
import { EducationList } from '@/components/organisms/EducationList/EducationList';
import { AwardList } from '@/components/organisms/MentorExpertise/AwardList';
import { GuideCountriesCard } from '@/components/organisms/MentorExpertise/GuideCountriesCard';
import { TopicsCard } from '@/components/organisms/MentorExpertise/TopicsCard';
import {
  OwnerEntryDelete,
  OwnerItemEditor,
  type ItemKind,
  type ItemOutcome,
  type ItemTarget,
} from '@/app/_profile/OwnerItemEditor';
import { useCountries } from '@/lib/api/data/catalog';
import {
  GUIDE_MAX,
  useGuideCountries,
  useMentorSettings,
  useSaveGuideCountries,
  type GuideCountry,
} from '@/lib/api/data/mentorSettings';
import { useOwnEducation } from '@/lib/api/data/profileEntries';
import { MENTOR_EXPERTISE_COPY as C } from '@/lib/copy/mentorSettings';
import { EDUCATION_COPY, SAVE_COPY } from '@/lib/copy/settings';
import { useLeaveGuard } from '@/lib/utils/leaveGuard';
import { rowOf } from './EducationPanel';
import type { PanelHandle } from './ProfilePanel';
import styles from './ExpertisePanel.module.css';

/** The design's countries, in its order (Mentor Settings.dc.html `guideTo`). */
const COMMON = [
  'United States',
  'United Kingdom',
  'Canada',
  'Germany',
  'Netherlands',
  'Ireland',
  'Australia',
  'France',
];
/** How long a toast stays (the design's flash: 5s). */
const TOAST_MS = 5000;
/** Matches shown under "Add another country". */
const MATCHES = 6;

const same = (a: GuideCountry[], b: GuideCountry[]) =>
  a.length === b.length && a.every((c, i) => c.id === b[i]!.id);
/** Case- and accent-insensitive, so "cote" finds Côte d’Ivoire. */
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Settings › Expertise for a mentor (Mentor Settings.dc.html `isExpertise`,
 * expertiseEdit=modal): topics, education and awards save in their own
 * modals (the Mentor Profile's editors); "Where can you guide mentees to?"
 * saves with the save bar.
 */
export const ExpertisePanel = forwardRef<PanelHandle, { userId: string }>(function ExpertisePanel(
  { userId },
  ref,
) {
  const settings = useMentorSettings(userId);
  const own = useOwnEducation(userId, true);
  const guide = useGuideCountries(userId);
  const saving = useSaveGuideCountries(userId);
  const { countries: catalog } = useCountries(true);
  const [query, setQuery] = useState('');

  // `base` is what's saved; `draft` is the chips. The server's list comes in
  // while nothing is unsaved; a save writes its result to the cache, so the
  // read can't put the old list back.
  const [base, setBase] = useState<GuideCountry[] | null>(null);
  const [draft, setDraft] = useState<GuideCountry[] | null>(null);
  const dirty = !!base && !!draft && !same(base, draft);
  if (guide.countries && (!base || (!dirty && !same(base, guide.countries)))) {
    setBase(guide.countries);
    setDraft(guide.countries);
  }

  const [item, setItem] = useState<ItemTarget | null>(null);
  const [deleting, setDeleting] = useState<{ kind: 'award' | 'education'; id: string } | null>(
    null,
  );
  const [toast, setToast] = useState<{ text: string; at: number } | null>(null);
  const said = useRef(0);
  const say = (text: string) => setToast({ text, at: ++said.current });
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  const awardsHeading = useRef<HTMLHeadingElement>(null);
  const awardsAdd = useRef<HTMLButtonElement>(null);
  const eduHeading = useRef<HTMLHeadingElement>(null);
  const eduAdd = useRef<HTMLButtonElement>(null);
  const guideHeading = useRef<HTMLDivElement>(null);
  // After a delete the row (and its button) is gone: its list's heading takes focus.
  const [refocus, setRefocus] = useState<{ el: HTMLElement | null; at: number } | null>(null);
  useEffect(() => {
    const at = document.activeElement;
    if (refocus?.el && (!at || at === document.body)) refocus.el.focus();
  }, [refocus]);

  // The save bar goes when the chips are clean again: focus it held moves to
  // the countries card rather than falling to the page (WCAG 2.4.3).
  const keepFocus = () => {
    const at = document.activeElement;
    if (!at || at === document.body || at.closest('[data-save-bar]'))
      requestAnimationFrame(() => guideHeading.current?.querySelector('h2')?.focus());
  };

  const discard = () => {
    if (base) setDraft(base);
    saving.reset();
    keepFocus();
  };
  const save = async (): Promise<boolean> => {
    if (!draft || saving.isPending) return false;
    try {
      await saving.mutateAsync(draft);
    } catch {
      return false;
    }
    keepFocus();
    setBase(draft);
    say(C.guideSaved);
    return true;
  };
  useImperativeHandle(ref, () => ({ dirty: () => dirty, save, discard }));
  useLeaveGuard(dirty, 'Expertise', save);

  const onSaved = (kind: ItemKind, outcome: ItemOutcome) => {
    setItem(null);
    if (kind === 'topics') say(C.topicsUpdated);
    else if (kind === 'award') say(outcome === 'added' ? C.awardAdded : C.awardUpdated);
    else if (kind === 'education')
      say(outcome === 'added' ? EDUCATION_COPY.added : EDUCATION_COPY.updated);
  };

  // Error before content: a failed first read says so, with Try again.
  if (settings.status === 'error' || guide.status === 'error')
    return (
      <EmptyState
        illustration="forms"
        title={C.loadError}
        actions={
          <Button
            variant="secondary-outlined"
            size="large"
            onClick={() => {
              settings.retry();
              guide.retry();
            }}
          >
            {C.retry}
          </Button>
        }
      />
    );
  const profile = settings.profile;
  if (!profile || !draft) return <ExpertiseSkeleton />;

  const byLabel = (label: string) => catalog.find((c) => c.label === label);
  const common = COMMON.flatMap((label) => {
    const hit = byLabel(label);
    return hit ? [{ id: hit.id, label: hit.label }] : [];
  });
  const q = norm(query.trim());
  const results = q
    ? catalog
        .filter((c) => norm(c.label).includes(q) && !draft.some((d) => d.id === c.id))
        .sort((a, b) => Number(!norm(a.label).startsWith(q)) - Number(!norm(b.label).startsWith(q)))
        .slice(0, MATCHES)
        .map((c) => ({ id: c.id, label: c.label }))
    : [];
  const awards = profile.awards.map((a) => ({
    id: a.id,
    title: a.title,
    meta: a.meta,
    funding: a.funding,
  }));

  return (
    <>
      <div className={styles.stack}>
        <TopicsCard topics={profile.mentor.topics} onEdit={() => setItem({ kind: 'topics' })} />
        <div ref={guideHeading}>
          <GuideCountriesCard
            common={common}
            selected={draft}
            onToggle={(c) => {
              setToast(null);
              setDraft((d) =>
                d ? (d.some((x) => x.id === c.id) ? d.filter((x) => x.id !== c.id) : [...d, c]) : d,
              );
            }}
            query={query}
            onQueryChange={setQuery}
            results={results}
            status={catalog.length ? 'ready' : 'loading'}
            full={draft.length >= GUIDE_MAX}
          />
        </div>
        <EducationList
          status={own.status}
          rows={own.entries.map(rowOf)}
          onAdd={() => setItem({ kind: 'education', id: null })}
          onEdit={(id) => setItem({ kind: 'education', id })}
          onDelete={(id) => setDeleting({ kind: 'education', id })}
          onRetry={own.retry}
          retrying={own.retrying}
          errorKey={own.failures}
          headingRef={eduHeading}
          addRef={eduAdd}
          copy={{
            sub: C.educationSub,
            emptyTitle: C.educationEmptyTitle,
            emptyBody: C.educationEmptyBody,
          }}
        />
        <AwardList
          status="ready"
          rows={awards}
          onAdd={() => setItem({ kind: 'award', id: null })}
          onEdit={(id) => setItem({ kind: 'award', id })}
          onDelete={(id) => setDeleting({ kind: 'award', id })}
          onRetry={settings.retry}
          headingRef={awardsHeading}
          addRef={awardsAdd}
        />
      </div>
      {item && (
        <OwnerItemEditor
          target={item}
          profile={profile}
          onClose={() => setItem(null)}
          onSaved={onSaved}
        />
      )}
      {deleting && (
        <OwnerEntryDelete
          target={deleting}
          userId={userId}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            const kind = deleting.kind;
            setDeleting(null);
            say(kind === 'award' ? C.awardDeleted : EDUCATION_COPY.deleted);
            setRefocus({
              el: kind === 'award' ? awardsHeading.current : eduHeading.current,
              at: said.current,
            });
          }}
        />
      )}
      {dirty && (
        <SaveBar
          label={SAVE_COPY.barLabel}
          message={C.guideSaveBar}
          error={saving.error?.copy ?? null}
          discardLabel={SAVE_COPY.discard}
          saveLabel={SAVE_COPY.save}
          savingLabel={SAVE_COPY.saving}
          saving={saving.isPending}
          onDiscard={discard}
          onSave={() => void save()}
        />
      )}
      <Snackbar message={toast?.text ?? null} stamp={toast?.at} />
    </>
  );
});

/** The four cards' shapes while the profile loads. */
function ExpertiseSkeleton() {
  return (
    <div
      className={styles.stack}
      role="status"
      aria-busy="true"
      aria-label="Loading your expertise"
    >
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={styles.skeletonCard}>
          <Skeleton width="35%" height="20px" />
          <Skeleton width="70%" height="16px" />
          <Skeleton height="40px" radius="lg" />
        </div>
      ))}
    </div>
  );
}
