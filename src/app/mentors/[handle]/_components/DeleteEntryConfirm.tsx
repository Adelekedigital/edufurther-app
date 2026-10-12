'use client';

import { ConfirmDialog } from '@/components/templates/ConfirmDialog/ConfirmDialog';
import { useAwardEdit, useEducationEdit } from '@/lib/api/data/profileEntries';

type Props = {
  kind: 'award' | 'education';
  id: string;
  userId: string;
  onClose: () => void;
  /** After the delete landed and the profile refetched. */
  onDeleted: () => void;
};

/**
 * Deleting a degree or an award from its row (product 2026-09-30: Delete sits
 * beside Edit, not in the form). The project's delete pattern (design reply
 * #59; Session Types' confirm): "Delete this award?" / "This can’t be
 * undone." / Keep it · Delete award, the filled destructive button last.
 */
export function DeleteEntryConfirm({ kind, id, userId, onClose, onDeleted }: Props) {
  const awards = useAwardEdit(userId);
  const education = useEducationEdit(userId);
  const edit = kind === 'award' ? awards : education;
  const noun = kind === 'award' ? 'award' : 'education';
  const del = () =>
    kind === 'award' ? awards.removeAward(id, onDeleted) : education.removeEducation(id, onDeleted);
  return (
    <ConfirmDialog
      title={`Delete this ${noun}?`}
      subtitle="This can’t be undone."
      icon="delete"
      keepLabel="Keep it"
      confirmLabel={`Delete ${noun}`}
      pendingLabel="Deleting…"
      pending={edit.removing}
      error={edit.error}
      onKeep={onClose}
      onConfirm={del}
    />
  );
}
