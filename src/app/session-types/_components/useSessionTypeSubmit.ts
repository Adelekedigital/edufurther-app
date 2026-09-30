'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import type { useTopics } from '@/lib/api/data/mentors';
import { useCreateSessionType, type CreateError, type Created } from '@/lib/api/data/sessionTypes';
import { useSaveSessionType, type SaveResult } from '@/lib/api/data/sessionTypeEdit';
import { deviceTimeZone } from '@/lib/utils/format';
import {
  toCreateBody,
  toWindows,
  type Draft,
  type FieldErrors,
} from '@/lib/utils/sessionTypeDraft';
import type { Base, EditTarget } from './useSessionTypeDraft';

type Args = {
  edit: EditTarget | undefined;
  draft: Draft;
  setDraft: Dispatch<SetStateAction<Draft>>;
  setInitial: Dispatch<SetStateAction<Draft>>;
  base: Base | null;
  setBase: Dispatch<SetStateAction<Base | null>>;
  topics: ReturnType<typeof useTopics>['topics'];
  showErrors: (e: FieldErrors) => void;
  onPublished: (created: Created) => void;
  onSaved: () => void;
};

/**
 * Publish (create) or Save changes (edit). An edit saves in parts (the type,
 * its questions, its hours): what didn't save is said, and Save retries only that.
 */
export function useSessionTypeSubmit(a: Args) {
  const create = useCreateSessionType();
  const save = useSaveSessionType();
  // What didn't save last time (the type's own fields did): says so, and Save retries.
  const [partial, setPartial] = useState<SaveResult['failed']>([]);
  const [refusedQuestions, setRefusedQuestions] = useState(false);
  const onFieldErrors = (err: CreateError) => {
    if (Object.keys(err.fields).length) a.showErrors(err.fields);
  };

  const afterSave = (r: SaveResult) => {
    setPartial(r.failed);
    if (!r.failed.length) return a.onSaved();
    // New questions now exist: the draft carries their ids, so a retry doesn't add them twice.
    const addIds = (d: Draft): Draft => ({
      ...d,
      questions: d.questions.map((q) => (r.newIds[q.key] ? { ...q, id: r.newIds[q.key] } : q)),
    });
    const withIds = addIds(a.draft);
    // Onto the draft as it is now: anything typed during the save stays.
    a.setDraft((d) => addIds(d));
    a.setBase((b) => ({
      ...b!,
      draft: withIds,
      questions: r.saved.questions,
      windows: r.saved.windows,
    }));
    // Unsaved now means only the parts that didn't save.
    a.setInitial((i) => ({
      ...withIds,
      ...(r.failed.includes('questions') ? { questions: i.questions } : {}),
      ...(r.failed.includes('hours') ? { hours: i.hours, days: i.days } : {}),
    }));
    // A change the server refused on one question (an answered option): on it.
    const qErrors = Object.fromEntries(
      withIds.questions.flatMap((q, n) =>
        r.questionErrors[q.key] ? [[`question-${n}`, r.questionErrors[q.key]!]] : [],
      ),
    ) as FieldErrors;
    setRefusedQuestions(Object.keys(qErrors).length > 0 && r.onlyRefusals);
    if (Object.keys(qErrors).length) a.showErrors(qErrors);
  };

  const submit = () => {
    const ids = Object.fromEntries(a.topics.flatMap((t) => (t.id ? [[t.slug, t.id]] : [])));
    if (a.edit) {
      save
        .save({
          id: a.edit.id,
          draft: a.draft,
          // As saved now (after any partial save), so a retry sends only what's left.
          saved: a.base!.draft,
          savedQuestions: a.base!.questions,
          savedWindows: a.base!.windows,
          offeringIds: ids,
          timeZone: deviceTimeZone(),
        })
        .then(afterSave, onFieldErrors);
      return;
    }
    create.create(
      {
        body: toCreateBody(a.draft, ids),
        windows: a.draft.hours === 'custom' ? toWindows(a.draft.days, deviceTimeZone()) : [],
      },
      { onSuccess: a.onPublished, onError: onFieldErrors },
    );
  };

  // PROVISIONAL copy — design request #8.
  const partialNote = !partial.length
    ? null
    : refusedQuestions && partial.length === 1
      ? 'Your changes are saved, except the intake questions marked below.'
      : `Your changes are saved, except ${partial.map((x) => (x === 'questions' ? 'the intake questions' : 'the dedicated hours')).join(' and ')}. Save again to try those.`;

  return {
    submit,
    busy: a.edit ? save.isPending : create.isPending,
    error: (a.edit ? save.error?.message : create.error?.message) ?? partialNote,
    /** A change after a failed attempt clears its message. */
    resetError: () => {
      if (create.error) create.reset();
      if (save.error) save.reset();
    },
  };
}
