'use client';

import { ConfirmDialog } from '@/components/templates/ConfirmDialog/ConfirmDialog';

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
    <ConfirmDialog
      title="Remove your photo?"
      subtitle="Your initials show instead until you add a new one."
      icon="no_photography"
      keepLabel="Keep it"
      confirmLabel="Remove photo"
      onKeep={onKeep}
      onConfirm={onRemove}
    />
  );
}
