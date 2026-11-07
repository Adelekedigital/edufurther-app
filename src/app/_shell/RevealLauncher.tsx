'use client';

import { RevealDialog } from '@/components/templates/RevealDialog/RevealDialog';
import { REVEAL_REASON_MAX, usePreview, useRevealPreview } from '@/lib/api/data/preview';
import { PREVIEW_COPY } from '@/lib/copy/preview';

/**
 * Preview as user: the Reveal modal, wired to the reveal call, so every screen
 * with masked items (Messages, payments) opens the same one. Mount one per
 * screen, only while open. Closes itself once the reveal lands; the store and
 * the reads it reloads do the rest.
 */
export function RevealLauncher({ onClose }: { onClose: () => void }) {
  const { user } = usePreview();
  const reveal = useRevealPreview();
  return (
    <RevealDialog
      firstName={user?.firstName ?? ''}
      maxLength={REVEAL_REASON_MAX}
      pending={reveal.isPending}
      error={reveal.isError ? PREVIEW_COPY.reveal.failed : null}
      onReveal={(reason) => reveal.mutate(reason, { onSuccess: onClose })}
      onClose={onClose}
    />
  );
}
