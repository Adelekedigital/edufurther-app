'use client';

import { ConfirmDialog } from '@/components/templates/ConfirmDialog/ConfirmDialog';

type Props = {
  kind: 'award' | 'education';
  /** What goes, in the page's words; else just "This can’t be undone." */
  subtitle?: string;
  /** The delete is out. */
  pending: boolean;
  /** Why it failed, in our words. */
  error: string | null;
  onKeep: () => void;
  onConfirm: () => void;
};

/**
 * Deleting a degree or an award from its row (product 2026-09-30: Delete sits
 * beside Edit, not in the form). The project's delete pattern (design reply
 * #59; Session Types' confirm): "Delete this award?" / "This can’t be
 * undone." / Keep it · Delete award, the filled destructive button last.
 * The page owns the request: the Mentor Profile and Settings › Education.
 */
export function DeleteEntryConfirm({ kind, subtitle, pending, error, onKeep, onConfirm }: Props) {
  const noun = kind === 'award' ? 'award' : 'education';
  return (
    <ConfirmDialog
      title={`Delete this ${noun}?`}
      subtitle={subtitle ?? 'This can’t be undone.'}
      icon="delete"
      keepLabel="Keep it"
      confirmLabel={`Delete ${noun}`}
      pendingLabel="Deleting…"
      pending={pending}
      error={error}
      onKeep={onKeep}
      onConfirm={onConfirm}
    />
  );
}
