'use client';

import { useState, type ReactNode } from 'react';
import {
  ProfileItemModal,
  type ItemShell,
} from '@/components/organisms/ProfileItemModal/ProfileItemModal';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { useDegreeLevels } from '@/lib/api/data/catalog';
import {
  educationBody,
  educationPatch,
  useEducationEdit,
  useOwnEducation,
} from '@/lib/api/data/profileEntries';
import { useInstitutionSearch } from '@/lib/api/data/mentorApplication';
import type { EducationAudience } from '@/lib/copy/education';
import { levelCodeFor } from '@/lib/utils/degrees';

// The form has no country row (the meta shows the school's country), so no ids to map.
const NO_COUNTRIES: never[] = [];

/** The modal frame ProfileItemModal asks its page for. */
export function itemFrame(onClose: () => void) {
  return function ItemFrame(s: ItemShell, body: ReactNode) {
    return (
      <ModalShell title={s.title} subtitle={s.subtitle} icon={s.icon} onClose={onClose}>
        {body}
      </ModalShell>
    );
  };
}

type Props = {
  userId: string;
  /** The degree being edited; null adds one. */
  id: string | null;
  onClose: () => void;
  /** After the save landed and the lists refetched. */
  onSaved: (outcome: 'saved' | 'added') => void;
  /** Whose degrees: the form mentions a mentor card only to a mentor. */
  audience: EducationAudience;
};

/**
 * Adding or editing one of your degrees (ProfileItemModal.dc.html
 * `education`), wherever they're listed: the Mentor Profile and Settings ›
 * Education. Mounted only while open.
 */
export function EducationEditor({ userId, id, onClose, onSaved, audience }: Props) {
  const edu = useEducationEdit(userId);
  // The owner's own list carries what the form needs (backend reply).
  const own = useOwnEducation(userId, true);
  const levels = useDegreeLevels(true);
  // What's typed into School; a saved school isn't searched until it's changed.
  const [schoolQ, setSchoolQ] = useState('');
  const schools = useInstitutionSearch(schoolQ, NO_COUNTRIES);
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
    // Unchanged degree: its saved level stands, even if legacy (review of #93).
    if (entry && degree === entry.values.degree) return entry.levelId;
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
      audience={audience}
      schools={{ ...schools, onQueryChange: setSchoolQ }}
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
              () => onSaved('saved'),
            )
          : edu.addEducation(educationBody(values, levelIdFor(values.degree)), () =>
              onSaved('added'),
            )
      }
      onClose={close}
      renderShell={itemFrame(close)}
    />
  );
}
