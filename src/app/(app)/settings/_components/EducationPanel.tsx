'use client';

import { useEffect, useRef, useState } from 'react';
import { Snackbar } from '@/components/molecules/Snackbar/Snackbar';
import { EducationList } from '@/components/organisms/EducationList/EducationList';
import { DeleteEntryConfirm } from '@/components/templates/DeleteEntryConfirm/DeleteEntryConfirm';
import { useEducationEdit, useOwnEducation } from '@/lib/api/data/profileEntries';
import { EDUCATION_COPY } from '@/lib/copy/settings';
import { educationTitle, educationWhere, type EducationRow } from '@/lib/utils/educationLine';
import { focusIfShown } from '@/lib/utils/focus';
import type { EducationEntry } from '@/types/mentor';
import { EducationEditor } from '@/app/_profile/EducationEditor';

/** How long a toast stays (the design's flash: 5s). */
const TOAST_MS = 5000;

const year = (date: string | null) => date?.slice(0, 4) || null;

/** A saved degree as the list shows it: with no abbreviation, its level's name. */
export const rowOf = (e: EducationEntry): EducationRow => ({
  id: e.id,
  degree: e.values.degree === 'Other' ? e.levelName : e.values.degree,
  course: e.values.course,
  school: e.values.school,
  start: year(e.dateStart),
  end: year(e.dateEnd),
});

/**
 * Settings › Education (Mentee Settings.dc.html `isMEdu`): your degrees, each
 * added and edited in ProfileItemModal and deleted after a confirm. Every
 * change saves in its modal, so nothing unsaved lives on this tab.
 */
export function EducationPanel({ userId }: { userId: string }) {
  const own = useOwnEducation(userId, true);
  const edu = useEducationEdit(userId);
  const [editing, setEditing] = useState<{ id: string | null } | null>(null);
  // Kept as opened: the row leaves the list before the confirm closes.
  const [deleting, setDeleting] = useState<EducationRow | null>(null);
  const [toast, setToast] = useState<{ text: string; at: number } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  // Where focus goes if the control that had it is gone: after an add, the
  // header's Add (the empty state's is gone); after a delete, the heading.
  const [refocus, setRefocus] = useState<{ to: 'add' | 'heading'; at: number } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  // The control that opened the modal may be gone (a deleted row, the empty
  // state's Add): focus something near it rather than nowhere.
  useEffect(() => {
    if (!refocus) return;
    const at = document.activeElement;
    if (at && at !== document.body) return;
    if (refocus.to === 'add' && focusIfShown(addButton.current)) return;
    focusIfShown(heading.current);
  }, [refocus]);

  // Counts toasts: the same words twice still re-mount, so they're read again.
  const said = useRef(0);
  const say = (text: string, to: 'add' | 'heading') => {
    const at = ++said.current;
    setToast({ text, at });
    setRefocus({ to, at });
  };

  return (
    <>
      <EducationList
        status={own.status}
        rows={own.entries.map(rowOf)}
        onAdd={() => setEditing({ id: null })}
        onEdit={(id) => setEditing({ id })}
        onDelete={(id) => {
          const entry = own.entries.find((e) => e.id === id);
          if (entry) setDeleting(rowOf(entry));
        }}
        onRetry={own.retry}
        retrying={own.retrying}
        errorKey={own.failures}
        headingRef={heading}
        addRef={addButton}
      />
      {editing && (
        <EducationEditor
          userId={userId}
          id={editing.id}
          audience="mentee"
          onClose={() => setEditing(null)}
          onSaved={(outcome) => {
            setEditing(null);
            if (outcome === 'added') say(EDUCATION_COPY.added, 'add');
            else say(EDUCATION_COPY.updated, 'heading');
          }}
        />
      )}
      {deleting && (
        <DeleteEntryConfirm
          kind="education"
          subtitle={EDUCATION_COPY.deleteSub(educationTitle(deleting), educationWhere(deleting))}
          pending={edu.removing}
          error={edu.error}
          onKeep={() => {
            edu.reset();
            setDeleting(null);
          }}
          onConfirm={() =>
            edu.removeEducation(deleting.id, () => {
              setDeleting(null);
              say(EDUCATION_COPY.deleted, 'heading');
            })
          }
        />
      )}
      <Snackbar message={toast?.text ?? null} stamp={toast?.at} />
    </>
  );
}
