'use client';

import { useState } from 'react';
import { ProfileItemModal } from '@/components/organisms/ProfileItemModal/ProfileItemModal';
import { DeleteEntryConfirm } from '@/components/templates/DeleteEntryConfirm/DeleteEntryConfirm';
import { useCountries, useLanguageSearch } from '@/lib/api/data/catalog';
import { useTopics } from '@/lib/api/data/mentors';
import { useAwardEdit, useEducationEdit } from '@/lib/api/data/profileEntries';
import { useProfileItems } from '@/lib/api/data/profileItems';
import { groupTopics } from '@/lib/utils/topicGroups';
import { EducationEditor, itemFrame } from '@/app/_profile/EducationEditor';
import type { MentorProfile } from '@/types/mentor';

/** What the owner opened: a whole section, or one entry (null id: a new one). */
export type ItemTarget =
  | { kind: 'topics' }
  | { kind: 'background' }
  | { kind: 'award'; id: string | null }
  | { kind: 'education'; id: string | null };
export type ItemKind = ItemTarget['kind'];
export type ItemOutcome = 'saved' | 'added' | 'removed';

type Props = {
  target: ItemTarget;
  profile: MentorProfile;
  onClose: () => void;
  /** After a save has landed and the profile refetched. */
  onSaved: (kind: ItemKind, outcome: ItemOutcome) => void;
};

type EditorProps = Omit<Props, 'target'>;

/**
 * The owner's item editors (ProfileItemModal.dc.html), shared by the Mentor
 * Profile and Settings › Expertise, each with only the
 * data it needs. Mounted only while open, so nothing is fetched until then.
 * The profile's values are taken when it opens: a refetch meanwhile can't
 * change what counts as "changed" (as for the intro, review of #78).
 */
export function OwnerItemEditor({ target, ...rest }: Props) {
  if (target.kind === 'topics') return <TopicsEditor {...rest} />;
  if (target.kind === 'background') return <BackgroundEditor {...rest} />;
  if (target.kind === 'education') return <OwnEducationEditor id={target.id} {...rest} />;
  return <AwardEditor id={target.id} {...rest} />;
}

function TopicsEditor({ profile, onClose, onSaved }: EditorProps) {
  const items = useProfileItems(profile.mentor.id);
  const [slugs] = useState(() => profile.mentor.topics.map((t) => t.slug));
  const topics = useTopics();
  const close = () => {
    items.resetTopics();
    onClose();
  };
  // What's cached wins over a failed refetch (the catalog is shared with Explore).
  const status =
    topics.topics.length > 0
      ? 'ready'
      : topics.error
        ? 'error'
        : topics.isLoading
          ? 'loading'
          : 'ready';
  const options = topics.topics.flatMap((t) =>
    t.id ? [{ id: t.id, slug: t.slug, label: t.label }] : [],
  );
  return (
    <ProfileItemModal
      kind="topics"
      groups={groupTopics(options)}
      initial={options.filter((o) => slugs.includes(o.slug)).map((o) => o.id)}
      catalog={{ status, onRetry: topics.retry }}
      saving={items.topicsSaving}
      error={items.topicsError}
      onSave={(ids) => items.saveTopics(ids, () => onSaved('topics', 'saved'))}
      onClose={close}
      renderShell={itemFrame(close)}
    />
  );
}

function BackgroundEditor({ profile, onClose, onSaved }: EditorProps) {
  const items = useProfileItems(profile.mentor.id);
  const [b] = useState(() => profile.background);
  const countries = useCountries(true);
  const [q, setQ] = useState('');
  const languages = useLanguageSearch(q, true);
  const close = () => {
    items.resetBackground();
    onClose();
  };
  const before = { originId: b.originId ?? '', studyId: b.studyId ?? '', languages: b.languages };
  return (
    <ProfileItemModal
      kind="background"
      countries={countries.countries}
      languages={{
        results: languages.results,
        query: q,
        onQueryChange: setQ,
        status: languages.status,
        onRetry: languages.retry,
      }}
      initial={before}
      catalog={{ status: countries.status, onRetry: countries.retry }}
      saving={items.backgroundSaving}
      error={items.backgroundError}
      onSave={(after) =>
        items.saveBackground(
          {
            originId: before.originId,
            studyId: before.studyId,
            languageIds: before.languages.map((l) => l.id),
          },
          {
            originId: after.originId,
            studyId: after.studyId,
            languageIds: after.languages.map((l) => l.id),
          },
          () => onSaved('background', 'saved'),
          { all: !!items.backgroundError },
        )
      }
      onClose={close}
      renderShell={itemFrame(close)}
    />
  );
}

function AwardEditor({ id, profile, onClose, onSaved }: EditorProps & { id: string | null }) {
  const awards = useAwardEdit(profile.mentor.id);
  const [base] = useState(() => profile.awards.find((a) => a.id === id)?.values ?? null);
  // The year the form counts back from; read once (the device clock).
  const [thisYear] = useState(() => new Date().getFullYear());
  const close = () => {
    awards.reset();
    onClose();
  };
  return (
    <ProfileItemModal
      kind="award"
      editing={!!id}
      // An award removed elsewhere since the page loaded: a load error, so
      // Save can't turn the edit into an add (review of #93).
      catalog={{ status: id && !base ? 'error' : 'ready', onRetry: close }}
      initial={base}
      thisYear={thisYear}
      saving={awards.saving}
      error={awards.error}
      onSave={(values) =>
        id && base
          ? awards.editAward(id, base, values, () => onSaved('award', 'saved'))
          : awards.addAward(values, () => onSaved('award', 'added'))
      }
      onClose={close}
      renderShell={itemFrame(close)}
    />
  );
}

function OwnEducationEditor({
  id,
  profile,
  onClose,
  onSaved,
}: EditorProps & { id: string | null }) {
  return (
    <EducationEditor
      userId={profile.mentor.id}
      id={id}
      audience="mentor"
      onClose={onClose}
      onSaved={(outcome) => onSaved('education', outcome)}
    />
  );
}

type DeleteProps = {
  target: { kind: 'award' | 'education'; id: string };
  userId: string;
  onClose: () => void;
  /** After the delete landed and the profile refetched. */
  onDeleted: () => void;
};

/** The owner's delete confirm for a degree or an award, with its request. */
export function OwnerEntryDelete({ target, userId, onClose, onDeleted }: DeleteProps) {
  const awards = useAwardEdit(userId);
  const education = useEducationEdit(userId);
  const edit = target.kind === 'award' ? awards : education;
  return (
    <DeleteEntryConfirm
      kind={target.kind}
      pending={edit.removing}
      error={edit.error}
      onKeep={onClose}
      onConfirm={() =>
        target.kind === 'award'
          ? awards.removeAward(target.id, onDeleted)
          : education.removeEducation(target.id, onDeleted)
      }
    />
  );
}
