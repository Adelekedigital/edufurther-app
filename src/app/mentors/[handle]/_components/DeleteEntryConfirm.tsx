'use client';

import { Button } from '@/components/atoms/Button/Button';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { useAwardEdit, useEducationEdit } from '@/lib/api/data/profileEntries';
import styles from './MentorProfileScreen.module.css';

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
  const busy = edit.removing;
  const noun = kind === 'award' ? 'award' : 'education';
  const del = () =>
    kind === 'award' ? awards.removeAward(id, onDeleted) : education.removeEducation(id, onDeleted);
  return (
    <ModalShell
      title={`Delete this ${noun}?`}
      subtitle="This can’t be undone."
      icon="delete"
      tone="danger"
      size="sm"
      onClose={onClose}
    >
      {edit.error && (
        <p role="alert" className={styles.confirmError}>
          {edit.error}
        </p>
      )}
      <div className={styles.confirmButtons}>
        <Button size="large" variant="secondary-outlined" fullWidth onClick={onClose}>
          Keep it
        </Button>
        <Button size="large" variant="destructive" fullWidth onClick={del} busy={busy}>
          {busy ? 'Deleting…' : `Delete ${noun}`}
        </Button>
      </div>
    </ModalShell>
  );
}
