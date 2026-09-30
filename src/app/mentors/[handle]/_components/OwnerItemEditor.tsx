'use client';

import { useState, type ReactNode } from 'react';
import {
  ProfileItemModal,
  type ItemShell,
} from '@/components/organisms/ProfileItemModal/ProfileItemModal';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { useCountries, useDegreeLevels, useLanguageSearch } from '@/lib/api/data/catalog';
import { useTopics } from '@/lib/api/data/mentors';
import {
  educationBody,
  educationPatch,
  useAwardEdit,
  useEducationEdit,
  useOwnEducation,
} from '@/lib/api/data/profileEntries';
import { useProfileItems } from '@/lib/api/data/profileItems';
import { levelCodeFor } from '@/lib/utils/degrees';
import { groupTopics } from '@/lib/utils/topicGroups';
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

function frame(onClose: () => void) {
  return function ItemFrame(s: ItemShell, body: ReactNode) {
    return (
      <ModalShell title={s.title} subtitle={s.subtitle} icon={s.icon} onClose={onClose}>
        {body}
      </ModalShell>
    );
  };
}

/**
 * The owner's item editors (ProfileItemModal.dc.html), each with only the
 * data it needs. Mounted only while open, so nothing is fetched until then.
 * The profile's values are taken when it opens: a refetch meanwhile can't
 * change what counts as "changed" (as for the intro, review of #78).
 */
export function OwnerItemEditor({ target, ...rest }: Props) {
  if (target.kind === 'topics') return <TopicsEditor {...rest} />;
  if (target.kind === 'background') return <BackgroundEditor {...rest} />;
  if (target.kind === 'education') return <EducationEditor id={target.id} {...rest} />;
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
      renderShell={frame(close)}
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
      renderShell={frame(close)}
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
      initial={base}
      thisYear={thisYear}
      saving={awards.saving}
      error={awards.error}
      onSave={(values) =>
        id && base
          ? awards.editAward(id, base, values, () => onSaved('award', 'saved'))
          : awards.addAward(values, () => onSaved('award', 'added'))
      }
      remove={
        id
          ? {
              noun: 'award',
              removing: awards.removing,
              onRemove: () => awards.removeAward(id, () => onSaved('award', 'removed')),
            }
          : undefined
      }
      onClose={close}
      renderShell={frame(close)}
    />
  );
}

function EducationEditor({ id, profile, onClose, onSaved }: EditorProps & { id: string | null }) {
  const userId = profile.mentor.id;
  const edu = useEducationEdit(userId);
  // The owner's own list carries what the form needs (backend reply).
  const own = useOwnEducation(userId, true);
  const levels = useDegreeLevels(true);
  const [thisYear] = useState(() => new Date().getFullYear());
  const close = () => {
    edu.reset();
    onClose();
  };
  const entry = id ? own.entries.find((e) => e.id === id) : undefined;
  const loaded = own.status === 'ready' && levels.status === 'ready';
  // A degree removed elsewhere since the page loaded reads as a failed load.
  const status =
    own.status === 'error' || levels.status === 'error' || (loaded && id && !entry)
      ? 'error'
      : loaded
        ? 'ready'
        : 'loading';
  const levelIdFor = (degree: string) => {
    const code = levelCodeFor(degree);
    // A saved abbreviation the form doesn't list keeps its saved level.
    if (code === undefined) return entry?.levelId ?? null;
    return code === null ? null : (levels.levels.find((l) => l.code === code)?.id ?? null);
  };
  return (
    <ProfileItemModal
      kind="education"
      editing={!!id}
      initial={entry?.values ?? null}
      thisYear={thisYear}
      hasOther={own.entries.some((e) => e.values.current && e.id !== id)}
      catalog={{
        status,
        onRetry: () => {
          own.retry();
          levels.retry();
        },
      }}
      saving={edu.saving}
      error={edu.error}
      onSave={(values) =>
        entry
          ? edu.editEducation(
              entry.id,
              educationPatch(
                educationBody(entry.values, entry.levelId, entry),
                educationBody(values, levelIdFor(values.degree), entry),
              ),
              () => onSaved('education', 'saved'),
            )
          : edu.addEducation(educationBody(values, levelIdFor(values.degree)), () =>
              onSaved('education', 'added'),
            )
      }
      remove={
        id
          ? {
              noun: 'education',
              removing: edu.removing,
              onRemove: () => edu.removeEducation(id, () => onSaved('education', 'removed')),
            }
          : undefined
      }
      onClose={close}
      renderShell={frame(close)}
    />
  );
}
