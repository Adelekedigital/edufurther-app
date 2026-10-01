'use client';

import { Button } from '@/components/atoms/Button/Button';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import styles from './MentorProfileScreen.module.css';

/**
 * "Remove photo" (ProfilePhoto.dc.html `confirmOpen`): a danger confirm, "Keep
 * it" first and the filled destructive button last. Confirming closes it; the
 * photo shows the removal.
 */
export function RemovePhotoConfirm({
  onKeep,
  onRemove,
}: {
  onKeep: () => void;
  onRemove: () => void;
}) {
  return (
    <ModalShell
      title="Remove your photo?"
      subtitle="Your initials show instead until you add a new one."
      icon="no_photography"
      tone="danger"
      size="sm"
      onClose={onKeep}
    >
      <div className={styles.confirmButtons}>
        <Button size="large" variant="secondary-outlined" fullWidth onClick={onKeep}>
          Keep it
        </Button>
        <Button size="large" variant="destructive" fullWidth onClick={onRemove}>
          Remove photo
        </Button>
      </div>
    </ModalShell>
  );
}
