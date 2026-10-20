'use client';

import Link from 'next/link';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { CoverPicker } from '@/components/molecules/CoverPicker/CoverPicker';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { SaveBar } from '@/components/molecules/SaveBar/SaveBar';
import { Snackbar } from '@/components/molecules/Snackbar/Snackbar';
import { MentorCoverCard } from '@/components/organisms/MentorCard/MentorCoverCard';
import { MentorProfileForm } from '@/components/organisms/MentorProfileForm/MentorProfileForm';
import { RemovePhotoConfirm } from '@/components/templates/RemovePhotoConfirm/RemovePhotoConfirm';
import { useAvatarUpload } from '@/lib/api/data/avatar';
import { useCountries, useLanguageSearch } from '@/lib/api/data/catalog';
import { BANNER_ACCEPT, useCoverEdit } from '@/lib/api/data/cover';
import {
  MentorProfileSaveError,
  headlineProblem,
  useMentorSettings,
  useSaveMentorProfile,
  withSaved,
} from '@/lib/api/data/mentorSettings';
import { useWritingAssist } from '@/lib/api/data/writingAssist';
import {
  MENTOR_PROFILE_COPY as C,
  previewPlace,
  type MentorProfileGap,
} from '@/lib/copy/mentorSettings';
import { SAVE_COPY } from '@/lib/copy/settings';
import { coverFor, coverVars, topicIcon } from '@/lib/utils/cover';
import { useLeaveGuard } from '@/lib/utils/leaveGuard';
import { checkFullName, NAME_PROBLEM_COPY, tidyName } from '@/lib/utils/name';
import { useRequiredFields } from '@/lib/utils/useRequiredFields';
import type { MentorProfileValues } from '@/types/mentorSettings';
import type { PanelHandle } from './ProfilePanel';
import styles from './MentorProfilePanel.module.css';

/** The design's eight languages, in its order (Mentor Settings.dc.html `languages`). */
const COMMON = ['English', 'French', 'Yoruba', 'Swahili', 'Hausa', 'Igbo', 'Arabic', 'Portuguese'];
/** How long "Profile saved" stays (the design's flash: 5s). */
const TOAST_MS = 5000;

const same = (a: MentorProfileValues, b: MentorProfileValues) =>
  a.name === b.name &&
  a.headline === b.headline &&
  a.about === b.about &&
  a.aboutDrafted === b.aboutDrafted &&
  a.originId === b.originId &&
  a.studyId === b.studyId &&
  a.gender === b.gender &&
  a.languages.length === b.languages.length &&
  a.languages.every((l, i) => l.id === b.languages[i]!.id);

// In the form's order, so the first gap is the first field to fix.
const gapsOf = (v: MentorProfileValues, saved: MentorProfileValues): MentorProfileGap[] => [
  ...(checkFullName(v.name) ? ['name' as const] : []),
  ...(headlineProblem(saved.headline, v.headline) ? ['headline' as const] : []),
  ...(v.originId ? [] : ['origin' as const]),
  ...(v.studyId ? [] : ['study' as const]),
  ...(v.languages.length ? [] : ['langs' as const]),
];

/**
 * Settings › Profile for a mentor (Mentor Settings.dc.html `isProfile`,
 * saveMode explicit): any change raises the save bar and updates the preview
 * before it's saved; Save writes only what changed. Photo and cover save on
 * their own, as on the profile page.
 */
export const MentorProfilePanel = forwardRef<PanelHandle, { userId: string }>(
  function MentorProfilePanel({ userId }, ref) {
    const { status, values, profile, slug, retry } = useMentorSettings(userId);
    const saving = useSaveMentorProfile(userId);
    const avatar = useAvatarUpload(slug ?? '', slug ? userId : null);
    const coverEdit = useCoverEdit(slug ?? '', slug ? userId : null);
    const { countries } = useCountries(true);
    const common = useLanguageSearch('', true);
    const [query, setQuery] = useState('');
    const search = useLanguageSearch(query, query.trim() !== '');
    const { assist } = useWritingAssist('mentor_about');

    // `base` is what's saved; `draft` is the form. The server's values come in
    // whenever nothing is unsaved (a refetch must not wipe an edit), with one
    // exception: right after a save the read still holds the values from
    // before it (`superseded`) until its refetch lands, and those mustn't
    // replace what saved. Any other value (another tab, a refocus) comes in.
    const [base, setBase] = useState<MentorProfileValues | null>(null);
    const [draft, setDraft] = useState<MentorProfileValues | null>(null);
    const [superseded, setSuperseded] = useState<MentorProfileValues | null>(null);
    const dirty = !!base && !!draft && !same(base, draft);
    const outdated = !!values && !!superseded && same(values, superseded);
    if (superseded && values && !outdated) setSuperseded(null);
    if (values && !outdated && (!base || (!dirty && !same(base, values)))) {
      setBase(values);
      setDraft(values);
    }

    const [promptVersion, setPromptVersion] = useState<string | null>(null);
    const [assistBusy, setAssistBusy] = useState(false);
    const [waitDraft, setWaitDraft] = useState(false);
    const [tries, setTries] = useState(0);
    const [toast, setToast] = useState<string | null>(null);
    const [toastStamp, setToastStamp] = useState(0);
    const [confirmRemove, setConfirmRemove] = useState(false);
    const heading = useRef<HTMLHeadingElement>(null);
    const required = useRequiredFields(draft && base ? gapsOf(draft, base) : []);

    useEffect(() => {
      if (!toast) return;
      const t = setTimeout(() => setToast(null), TOAST_MS);
      return () => clearTimeout(t);
    }, [toast]);

    // The save bar goes when the form is clean again: focus it held moves to
    // "About you" rather than falling to the page (WCAG 2.4.3).
    const keepFocus = () => {
      const at = document.activeElement;
      if (!at || at === document.body || at.closest('[data-save-bar]'))
        requestAnimationFrame(() => heading.current?.focus());
    };

    const discard = () => {
      if (base) setDraft(base);
      setPromptVersion(null);
      required.reset();
      saving.reset();
      setWaitDraft(false);
      keepFocus();
    };

    const save = async (): Promise<boolean> => {
      if (!base || !draft || saving.isPending) return false;
      // An AI draft is being written: saving now would keep the old About.
      if (assistBusy) {
        setWaitDraft(true);
        setTries((n) => n + 1);
        return false;
      }
      setWaitDraft(false);
      if (!required.check()) {
        setTries((n) => n + 1);
        return false;
      }
      const after = { ...draft, name: tidyName(draft.name) };
      try {
        await saving.mutateAsync({ before: base, after, promptVersion });
      } catch (e) {
        // What landed is saved; only the rest stays unsaved. The name as
        // sent (tidied), so a retry doesn't send it again.
        if (e instanceof MentorProfileSaveError && e.saved.length) {
          setBase(withSaved(base, after, e.saved));
          if (values) setSuperseded(values);
          setDraft((d) => (d ? { ...d, name: after.name } : d));
        }
        setTries((n) => n + 1);
        return false;
      }
      keepFocus();
      if (values) setSuperseded(values);
      setBase(after);
      setDraft(after);
      setPromptVersion(null);
      setToast(C.saved);
      setToastStamp((n) => n + 1);
      return true;
    };

    // The tab-switch guard reads these when asked: rebuilt each render, so current.
    useImperativeHandle(ref, () => ({ dirty: () => dirty, save, discard }));
    useLeaveGuard(dirty, 'Profile', save);

    // Error before content: a failed first load says so, with Try again.
    if (status === 'error')
      return (
        <EmptyState
          illustration="forms"
          title={C.loadError}
          actions={
            <Button variant="secondary-outlined" size="large" onClick={retry}>
              {C.retry}
            </Button>
          }
        />
      );
    if (status === 'loading' || !profile || !draft || !base) return <MentorProfileSkeleton />;

    const nameProblem = checkFullName(draft.name);
    const coverKey = profile.cover.color ?? coverFor(profile.mentor.id);
    const { bg, ink } = coverVars(coverKey);
    const artIcons =
      profile.cover.art === 'icons'
        ? profile.mentor.topics.slice(0, 3).map((t) => topicIcon(t.label))
        : [];
    // The catalog's name, else the name the profile read has for the saved id
    // (a country since retired from the catalog is still the mentor's).
    const countryName = (id: string, savedId: string, savedName: string | null) =>
      countries.find((c) => c.id === id)?.label ?? (id && id === savedId ? savedName : null);
    const commonOptions = COMMON.flatMap((name) => {
      const hit = common.results.find((r) => r.label === name);
      return hit ? [{ id: hit.id, label: hit.label }] : [];
    });
    const initial = (draft.name.trim() || profile.mentor.name)[0]?.toUpperCase() ?? '?';

    return (
      <>
        <MentorProfileForm
          values={draft}
          onChange={(patch) => {
            // A new edit after "Profile saved": the bar comes straight back.
            setToast(null);
            setDraft((d) => (d ? { ...d, ...patch } : d));
          }}
          errors={required.errors}
          nameError={
            nameProblem && nameProblem !== 'required' ? NAME_PROBLEM_COPY[nameProblem] : undefined
          }
          headlineTooLong={headlineProblem(base.headline, draft.headline) === 'tooLong'}
          headingRef={heading}
          countries={countries}
          photo={{
            url: profile.mentor.photoUrl,
            initial,
            name: profile.mentor.name,
            accept: avatar.accept,
            uploading: avatar.uploading,
            removing: avatar.removing,
            error: avatar.error,
            errorFrom: avatar.errorFrom,
            removedStamp: avatar.removedStamp,
            onFile: avatar.upload,
            onRemove: () => setConfirmRemove(true),
            onRetryRemove: avatar.remove,
            onDismissError: avatar.dismissError,
          }}
          cover={{ bg, ink, bannerUrl: profile.bannerUrl, artIcons }}
          coverTools={
            <CoverPicker
              color={coverKey}
              artOn={profile.cover.art !== 'none'}
              onPickColor={coverEdit.pickColor}
              onToggleArt={(on) => coverEdit.save({ art: on ? 'icons' : 'none' })}
              saveState={coverEdit.saveState}
              savedStamp={coverEdit.savedStamp}
              hasImage={!!profile.bannerUrl}
              accept={BANNER_ACCEPT}
              uploading={coverEdit.uploading}
              onRemoveImage={coverEdit.removeImage}
              removing={coverEdit.removing}
              removedStamp={coverEdit.removedStamp}
              imageError={coverEdit.imageError}
              onFile={coverEdit.upload}
              onClose={coverEdit.clearMessages}
            />
          }
          languages={{
            common: commonOptions,
            query,
            onQueryChange: setQuery,
            results: search.results,
            status: search.status,
          }}
          onAssist={async (mode, text) => {
            const out = await assist(mode, text);
            setPromptVersion(out.promptVersion);
            return out.text;
          }}
          onAssistBusy={setAssistBusy}
          preview={
            <>
              <div className={styles.previewHead}>
                <span className={styles.previewLabel}>{C.preview}</span>
                {slug && (
                  <Link href={`/mentors/${slug}`} prefetch={false} className={styles.openProfile}>
                    {C.openProfile}
                  </Link>
                )}
              </div>
              <MentorCoverCard
                name={draft.name.trim() || C.previewNameEmpty}
                headline={draft.headline.trim()}
                initials={initial}
                photoUrl={profile.mentor.photoUrl}
                cover={{ bg, ink }}
                bannerUrl={profile.bannerUrl}
                artIcons={artIcons}
                rating={profile.mentor.rating}
                reviewCount={profile.mentor.reviewCount}
                completedSessions={profile.mentor.completedSessions}
                place={previewPlace(
                  countryName(draft.originId, base.originId, profile.originCountry),
                  countryName(draft.studyId, base.studyId, profile.studyCountry),
                )}
                tags={profile.mentor.topics.slice(0, 3).map((t) => t.label)}
                copy={{ book: C.book, message: C.message }}
              />
            </>
          }
        />
        {dirty && (
          <SaveBar
            label={SAVE_COPY.barLabel}
            message={C.saveBar}
            error={
              waitDraft && assistBusy
                ? SAVE_COPY.waitForDraft
                : required.formError
                  ? SAVE_COPY.formError
                  : (saving.error?.copy ?? null)
            }
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
        {confirmRemove && (
          <RemovePhotoConfirm
            onKeep={() => setConfirmRemove(false)}
            onRemove={() => {
              setConfirmRemove(false);
              avatar.remove();
            }}
          />
        )}
      </>
    );
  },
);

/** The two columns' shapes while the profile loads. */
function MentorProfileSkeleton() {
  return (
    <div
      className={styles.skeleton}
      role="status"
      aria-busy="true"
      aria-label="Loading your profile"
    >
      <div className={styles.skeletonMain}>
        <div className={styles.skeletonCard}>
          <Skeleton height="120px" radius="lg" />
          <Skeleton width="72px" height="72px" radius="full" />
        </div>
        <div className={styles.skeletonCard}>
          <Skeleton width="25%" height="20px" />
          <Skeleton height="37px" radius="md" />
          <Skeleton height="37px" radius="md" />
          <Skeleton height="140px" radius="md" />
        </div>
      </div>
      <div className={styles.skeletonAside}>
        <Skeleton width="50%" height="16px" />
        <Skeleton height="320px" radius="lg" />
      </div>
    </div>
  );
}
