'use client';

import { useState, type ReactNode } from 'react';
import {
  ProfileItemModal,
  type ItemShell,
} from '@/components/organisms/ProfileItemModal/ProfileItemModal';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { useCountries, useLanguageSearch } from '@/lib/api/data/catalog';
import { useTopics } from '@/lib/api/data/mentors';
import { useProfileItems } from '@/lib/api/data/profileItems';
import { groupTopics } from '@/lib/utils/topicGroups';
import type { MentorProfile } from '@/types/mentor';

export type ItemKind = 'topics' | 'background';

type Props = {
  kind: ItemKind;
  profile: MentorProfile;
  onClose: () => void;
  /** After a save has landed and the profile refetched. */
  onSaved: (kind: ItemKind) => void;
};

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
 * The owner's topics or background editor (ProfileItemModal.dc.html), with
 * its catalogs. Mounted only while open, so nothing is fetched until then.
 * The profile's values are taken when it opens: a refetch meanwhile can't
 * change what counts as "changed" (as for the intro, review of #78).
 */
export function OwnerItemEditor({ kind, profile, onClose, onSaved }: Props) {
  const items = useProfileItems(profile.mentor.id);
  const [base] = useState(() => ({
    slugs: profile.mentor.topics.map((t) => t.slug),
    background: profile.background,
  }));
  const topics = useTopics();
  const countries = useCountries(kind === 'background');
  const [q, setQ] = useState('');
  const languages = useLanguageSearch(q, kind === 'background');
  const close = () => {
    items.resetTopics();
    items.resetBackground();
    onClose();
  };

  if (kind === 'topics') {
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
    const initial = options.filter((o) => base.slugs.includes(o.slug)).map((o) => o.id);
    return (
      <ProfileItemModal
        kind="topics"
        groups={groupTopics(options)}
        initial={initial}
        catalog={{ status, onRetry: topics.retry }}
        saving={items.topicsSaving}
        error={items.topicsError}
        onSave={(ids) => items.saveTopics(ids, () => onSaved('topics'))}
        onClose={close}
        renderShell={frame(close)}
      />
    );
  }

  const b = base.background;
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
          () => onSaved('background'),
          { all: !!items.backgroundError },
        )
      }
      onClose={close}
      renderShell={frame(close)}
    />
  );
}
