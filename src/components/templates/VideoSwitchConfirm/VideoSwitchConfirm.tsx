'use client';

import { ConfirmDialog } from '@/components/templates/ConfirmDialog/ConfirmDialog';
import { SWITCHING, switchCopy, type VideoChoice } from '@/lib/copy/integrations';

type VideoSwitchConfirmProps = {
  /** What the mentor is on now, so the dialog can say what booked sessions keep. */
  from: VideoChoice;
  /** What they picked. A personal link is not reachable from the page. */
  to: 'daily' | 'google_meet';
  /** The PATCH is out: the confirm is busy and Keep is off. */
  pending: boolean;
  /** Our copy for a failed save. The dialog stays open and shows it. */
  error: string | null;
  onConfirm: () => void;
  onKeep: () => void;
};

/**
 * "Switch to Google Meet?" (Integrations.dc.html `switchOpen`, PRD decision 2):
 * picking a provider asks first, and nothing is saved until this is answered.
 *
 * Props only, no page data — Calendar's booking modal picks a venue from the
 * same cards and must ask the same question, or the two screens drift.
 *
 * Deliberately not a danger confirm: nothing is destroyed, booked sessions keep
 * the link they were booked with. So `swap_horiz` in the default blue, and the
 * primary button is the switch rather than a red one.
 */
export function VideoSwitchConfirm({
  from,
  to,
  pending,
  error,
  onConfirm,
  onKeep,
}: VideoSwitchConfirmProps) {
  const copy = switchCopy(from, to);
  return (
    <ConfirmDialog
      title={copy.title}
      body={copy.body}
      icon="swap_horiz"
      tone="default"
      layout="stack"
      mobile="sheet"
      keepLabel={copy.keep}
      confirmLabel={copy.confirm}
      pendingLabel={SWITCHING}
      pending={pending}
      error={error}
      onKeep={onKeep}
      onConfirm={onConfirm}
    />
  );
}
