'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { FrozenGroup } from '@/components/atoms/FrozenGroup/FrozenGroup';
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
import { FREEZE_COPY, MENTOR_EXPERTISE_COPY as C } from '@/lib/copy/mentorSettings';
import { EDUCATION_COPY, SAVE_COPY } from '@/lib/copy/settings';
import { useLeaveGuard } from '@/lib/utils/leaveGuard';
import { rowOf } from './EducationPanel';
import type { PanelHandle } from './ProfilePanel';
import { ReviewFreeze } from './ReviewFreeze';
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
 * saves with the save bar. `frozen`: the application is in review, and all
 * of this is what's reviewed, so the tab is read-only under the banner; a
 * countries save the freeze refuses (it began meanwhile) shows the same.
 */
type ExpertisePanelProps = { userId: string; frozen?: boolean };

export const ExpertisePanel = forwardRef<PanelHandle, ExpertisePanelProps>(function ExpertisePanel(
  { userId, frozen: inReview = false },
  ref,
) {
  const settings = useMentorSettings(userId);
  const own = useOwnEducation(userId, true);
  const guide = useGuideCountries(userId);
  const saving = useSaveGuideCountries(userId);
  const catalogRead = useCountries(true);
  const catalog = catalogRead.countries;
  // Each Try again on the catalog: a failure after it is said again.
  const [catalogTries, setCatalogTries] = useState(0);
  // Each failed save: the same error twice is still said again (SaveBar errorKey).
  const [saveTries, setSaveTries] = useState(0);
  const [query, setQuery] = useState('');

  // `base` is what's saved; `draft` is the chips. The server's list comes in
  // while nothing is unsaved; a save writes its result to the cache, so the
  // read can't put the old list back.
  const [base, setBase] = useState<GuideCountry[] | null>(null);
  const [draft, setDraft] = useState<GuideCountry[] | null>(null);
  const frozen = inReview || !!saving.error?.inReview;
  // Frozen mid-edit: the countries go back to what's saved.
  if (frozen && base && draft && !same(base, draft)) setDraft(base);
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
  const topicsEdit = useRef<HTMLButtonElement>(null);
  // The control that had focus may be gone (a deleted row; an empty state's
  // Add once the list fills): focus its card's control, else its heading,
  // rather than the page (WCAG 2.4.3), as Education does.
  const [refocus, setRefocus] = useState<{
    first: { current: HTMLElement | null };
    then?: { current: HTMLElement | null };
    at: number;
  } | null>(null);
  useEffect(() => {
    if (!refocus) return;
    const at = document.activeElement;
    if (at && at !== document.body) return;
    for (const r of [refocus.first, refocus.then]) {
      const el = r?.current;
      if (el && el.isConnected && !(el as HTMLButtonElement).disabled) {
        el.focus();
        return;
      }
    }
  });

  // The save bar goes when the chips are clean again: focus it held moves to
  // the countries card rather than falling to the page (WCAG 2.4.3).
  const keepFocus = () => {
    const at = document.activeElement;
    if (!at || at === document.body || at.closest('[data-save-bar]'))
      requestAnimationFrame(() => guideHeading.current?.querySelector('h2')?.focus());
  };

  const commonIds = COMMON.flatMap((label) => {
    const hit = catalog.find((c) => c.label === label);
    return hit ? [hit.id] : [];
  });
  const shownOrder = (list: GuideCountry[]) => [
    ...commonIds.flatMap((id) => list.filter((c) => c.id === id)),
    ...list.filter((c) => !commonIds.includes(c.id)),
  ];

  const discard = () => {
    if (base) setDraft(base);
    saving.reset();
    keepFocus();
  };
  const save = async (): Promise<boolean> => {
    if (!draft || saving.isPending) return false;
    // In the order the chips show (the design's common ones first), so the
    // public profile lists them as the mentor sees them here.
    const sent = shownOrder(draft);
    try {
      await saving.mutateAsync(sent);
    } catch {
      setSaveTries((n) => n + 1);
      return false;
    }
    keepFocus();
    setBase(sent);
    setDraft(sent);
    say(C.guideSaved);
    return true;
  };
  useImperativeHandle(ref, () => ({ dirty: () => dirty, save, discard }));
  useLeaveGuard(dirty, 'Expertise', save);

  const onSaved = (kind: ItemKind, outcome: ItemOutcome) => {
    setItem(null);
    if (kind === 'topics') {
      say(C.topicsUpdated);
      setRefocus({ first: topicsEdit, at: said.current });
    } else if (kind === 'award') {
      say(outcome === 'added' ? C.awardAdded : C.awardUpdated);
      setRefocus({ first: awardsAdd, then: awardsHeading, at: said.current });
    } else if (kind === 'education') {
      say(outcome === 'added' ? EDUCATION_COPY.added : EDUCATION_COPY.updated);
      setRefocus({ first: eduAdd, then: eduHeading, at: said.current });
    }
  };

  // Error before content: a failed first read says so, with Try again. The
  // countries have their own read: its failure stays in its card.
  if (settings.status === 'error')
    return (
      <EmptyState
        illustration="forms"
        title={C.loadError}
        actions={
          <Button variant="secondary-outlined" size="large" onClick={settings.retry}>
            {C.retry}
          </Button>
        }
      />
    );
  const profile = settings.profile;
  if (!profile) return <ExpertiseSkeleton />;

  const byLabel = (label: string) => catalog.find((c) => c.label === label);
  const common = COMMON.flatMap((label) => {
    const hit = byLabel(label);
    return hit ? [{ id: hit.id, label: hit.label }] : [];
  });
  const q = norm(query.trim());
  const results = q
    ? catalog
        .filter((c) => norm(c.label).includes(q) && !draft?.some((d) => d.id === c.id))
        .sort((a, b) => Number(!norm(a.label).startsWith(q)) - Number(!norm(b.label).startsWith(q)))
        .slice(0, MATCHES)
        .map((c) => ({ id: c.id, label: c.label }))
    : [];
  // Frozen card by card: a card whose read failed shows only its Try again,
  // which must stay live (a disabled fieldset would take it too).
  const guideFailed = !draft && guide.status === 'error';
  const awards = profile.awards.map((a) => ({
    id: a.id,
    title: a.title,
    meta: a.meta,
    funding: a.funding,
  }));

  return (
    <>
      <ReviewFreeze frozen={frozen} userId={userId} words={FREEZE_COPY.expertise}>
        <div className={styles.stack}>
          <FrozenGroup frozen={frozen}>
            <TopicsCard
              topics={profile.mentor.topics}
              onEdit={() => setItem({ kind: 'topics' })}
              editRef={topicsEdit}
            />
          </FrozenGroup>
          <FrozenGroup frozen={frozen && !guideFailed}>
            <div ref={guideHeading}>
              <GuideCountriesCard
                common={common}
                selected={draft ?? []}
                onToggle={(c) => {
                  setToast(null);
                  setDraft((d) =>
                    !d
                      ? d
                      : d.some((x) => x.id === c.id)
                        ? d.filter((x) => x.id !== c.id)
                        : d.length >= GUIDE_MAX
                          ? d
                          : [...d, c],
                  );
                }}
                query={query}
                onQueryChange={setQuery}
                results={results}
                status={catalogRead.status}
                full={(draft?.length ?? 0) >= GUIDE_MAX}
                // Frozen, nothing can be added: the catalog doesn't matter.
                catalogFailed={
                  catalogRead.status === 'error' && !frozen
                    ? {
                        onRetry: () => {
                          setCatalogTries((n) => n + 1);
                          catalogRead.retry();
                        },
                        at: catalogTries,
                      }
                    : undefined
                }
                readFailed={guideFailed ? { onRetry: guide.retry } : undefined}
                loading={!draft && guide.status === 'loading'}
              />
            </div>
          </FrozenGroup>
          <FrozenGroup frozen={frozen && own.status !== 'error'}>
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
          </FrozenGroup>
          {/* Awards come with the profile read: the panel shows only once it has
            landed, and a failed refetch keeps them, so the list is always ready. */}
          <FrozenGroup frozen={frozen}>
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
          </FrozenGroup>
        </div>
      </ReviewFreeze>
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
              first: kind === 'award' ? awardsHeading : eduHeading,
              at: said.current,
            });
          }}
        />
      )}
      {dirty && (
        <SaveBar
          label={SAVE_COPY.barLabel}
          message={C.guideSaveBar}
          error={saving.error && !saving.error.inReview ? saving.error.copy : null}
          errorKey={saveTries}
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
