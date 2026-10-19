'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { SaveBar } from '@/components/molecules/SaveBar/SaveBar';
import { Snackbar } from '@/components/molecules/Snackbar/Snackbar';
import { MenteeProfileForm } from '@/components/organisms/MenteeProfileForm/MenteeProfileForm';
import { RemovePhotoConfirm } from '@/components/templates/RemovePhotoConfirm/RemovePhotoConfirm';
import { useAvatarUpload } from '@/lib/api/data/avatar';
import { useCountries, useLanguageSearch } from '@/lib/api/data/catalog';
import { ProfileSaveError, useMenteeProfile, useSaveMenteeProfile } from '@/lib/api/data/settings';
import { useWritingAssist } from '@/lib/api/data/writingAssist';
import { SAVE_COPY, SETTINGS_COPY, type ProfileGap } from '@/lib/copy/settings';
import { useLeaveGuard } from '@/lib/utils/leaveGuard';
import { checkFullName, NAME_PROBLEM_COPY, tidyName } from '@/lib/utils/name';
import { useRequiredFields } from '@/lib/utils/useRequiredFields';
import type { MenteeProfileValues } from '@/types/settings';
import styles from './ProfilePanel.module.css';

/** The design's eight languages, in its order (Mentee Settings.dc.html `mLangs`). */
const COMMON = ['English', 'French', 'Yoruba', 'Igbo', 'Hausa', 'Swahili', 'Arabic', 'Portuguese'];
/** How long "Profile saved" stays (the design's flash: 5s). */
const TOAST_MS = 5000;

const same = (a: MenteeProfileValues, b: MenteeProfileValues) =>
  a.name === b.name &&
  a.countryId === b.countryId &&
  a.bio === b.bio &&
  a.bioDrafted === b.bioDrafted &&
  a.languages.length === b.languages.length &&
  a.languages.every((l, i) => l.id === b.languages[i]!.id);

// The name follows the app's one name rule (lib/utils/name): the backend
// refuses a single word as `full_name`, so it's caught here, by the field.
const gapsOf = (v: MenteeProfileValues): ProfileGap[] => [
  ...(checkFullName(v.name) ? ['name' as const] : []),
  ...(v.countryId ? [] : ['country' as const]),
  ...(v.languages.length ? [] : ['langs' as const]),
];

/** What the screen needs to guard a tab switch. */
export type PanelHandle = {
  dirty: () => boolean;
  /** Saves; false when it couldn't (gaps shown, or the write failed). */
  save: () => Promise<boolean>;
  discard: () => void;
};

/**
 * Settings › Profile (Mentee Settings.dc.html `isMProfile`, saveMode
 * explicit): any change raises the save bar; Discard restores what's saved;
 * Save writes it and says "Profile saved". The photo saves on its own.
 */
export const ProfilePanel = forwardRef<PanelHandle, { userId: string }>(function ProfilePanel(
  { userId },
  ref,
) {
  const { profile, status, retry, retrying } = useMenteeProfile(userId);
  const saving = useSaveMenteeProfile(userId);
  const avatar = useAvatarUpload('', userId);
  const { countries } = useCountries(true);
  const common = useLanguageSearch('', true);
  const [query, setQuery] = useState('');
  const search = useLanguageSearch(query, query.trim() !== '');
  const { assist } = useWritingAssist('mentee_bio');

  // `base` is what's saved; `draft` is the form. The server's values come in
  // only while there's nothing unsaved (a refetch must not wipe an edit).
  const [base, setBase] = useState<MenteeProfileValues | null>(null);
  const [draft, setDraft] = useState<MenteeProfileValues | null>(null);
  const dirty = !!base && !!draft && !same(base, draft);
  if (profile) {
    const server: MenteeProfileValues = {
      name: profile.name,
      countryId: profile.countryId,
      languages: profile.languages,
      bio: profile.bio,
      bioDrafted: profile.bioDrafted,
    };
    if (!base || (!dirty && !same(base, server))) {
      setBase(server);
      setDraft(server);
    }
  }

  const [promptVersion, setPromptVersion] = useState<string | null>(null);
  const [assistBusy, setAssistBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const required = useRequiredFields(draft ? gapsOf(draft) : []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  // The save bar goes when the form is clean again: focus it held moves to
  // the section's heading rather than falling to the page (WCAG 2.4.3).
  const keepFocus = () => {
    const at = document.activeElement;
    if (!at || at === document.body || at.closest('[data-save-bar]'))
      requestAnimationFrame(() => heading.current?.focus());
  };

  const discard = () => {
    if (base) setDraft(base);
    required.reset();
    saving.reset();
    keepFocus();
  };

  const save = async (): Promise<boolean> => {
    // Not while an AI draft is being written: it would save the old bio.
    if (!base || !draft || saving.isPending || assistBusy) return false;
    if (!required.check()) return false;
    const after = { ...draft, name: tidyName(draft.name) };
    try {
      await saving.mutateAsync({ before: base, after, promptVersion });
    } catch (e) {
      // The name, country and bio landed, the languages didn't: only the
      // languages are still unsaved.
      if (e instanceof ProfileSaveError && e.profileSaved)
        setBase({ ...after, languages: base.languages });
      return false;
    }
    keepFocus();
    setBase(after);
    setDraft(after);
    setToast(SAVE_COPY.profileSaved);
    return true;
  };

  const nameProblem = draft ? checkFullName(draft.name) : null;

  // The tab-switch guard reads these when asked: rebuilt each render, so current.
  useImperativeHandle(ref, () => ({ dirty: () => dirty, save, discard }));
  useLeaveGuard(dirty, 'Profile', save);

  // Error before content: a failed first load says so, with Try again.
  if (status === 'error')
    return (
      <EmptyState
        illustration="forms"
        title={SETTINGS_COPY.loadError}
        description={SETTINGS_COPY.loadErrorBody}
        actions={
          <Button variant="secondary-outlined" size="large" onClick={retry} disabled={retrying}>
            {SETTINGS_COPY.retry}
          </Button>
        }
      />
    );
  if (status === 'loading' || !profile || !draft) return <ProfileSkeleton />;

  const commonOptions = COMMON.flatMap((name) => {
    const hit = common.results.find((r) => r.label === name);
    return hit ? [{ id: hit.id, label: hit.label }] : [];
  });

  return (
    <>
      <MenteeProfileForm
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
        headingRef={heading}
        countries={countries}
        photo={{
          url: profile.photoUrl,
          initial: profile.initial,
          name: profile.name,
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
      />
      {dirty && (
        <SaveBar
          label={SAVE_COPY.barLabel}
          message={SAVE_COPY.profileBar}
          error={required.formError ? SAVE_COPY.formError : (saving.error?.copy ?? null)}
          discardLabel={SAVE_COPY.discard}
          saveLabel={SAVE_COPY.save}
          savingLabel={SAVE_COPY.saving}
          saving={saving.isPending || assistBusy}
          onDiscard={discard}
          onSave={() => void save()}
        />
      )}
      <Snackbar message={toast} />
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
});

/** The two cards' shapes while /me loads. */
function ProfileSkeleton() {
  return (
    <div
      className={styles.skeleton}
      role="status"
      aria-busy="true"
      aria-label="Loading your profile"
    >
      <div className={styles.skeletonCard}>
        <Skeleton width="72px" height="72px" radius="full" />
        <div className={styles.skeletonLines}>
          <Skeleton width="30%" height="14px" />
          <Skeleton width="45%" height="12px" />
        </div>
      </div>
      <div className={styles.skeletonCard}>
        <div className={styles.skeletonLines}>
          <Skeleton width="25%" height="16px" />
          <Skeleton width="100%" height="37px" radius="md" />
          <Skeleton width="100%" height="37px" radius="md" />
          <Skeleton width="60%" height="40px" radius="md" />
          <Skeleton width="100%" height="120px" radius="md" />
        </div>
      </div>
    </div>
  );
}
