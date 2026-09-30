'use client';

import { useState } from 'react';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { Button } from '@/components/atoms/Button/Button';
import { Notice } from '@/components/molecules/Notice/Notice';
import { SessionTypeList } from '@/components/organisms/SessionTypeList/SessionTypeList';
import { SessionTypeQuickEdit } from '@/components/organisms/SessionTypeQuickEdit/SessionTypeQuickEdit';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { useQuickEditSessionType } from '@/lib/api/data/sessionTypeQuick';
import { useOwnSessionTypes, useRestoreSessionType } from '@/lib/api/data/sessionTypes';
import type { OwnerSessionCard, ProfileSessionType } from '@/types/mentor';
import type { OwnSessionType } from '@/types/sessionType';

/**
 * Design `pendingNote` (Mentor Profile.dc.html): "Hidden from mentees. Deleted
 * after its last booked session on Oct 14. The 2 booked sessions go ahead."
 */
export function profilePendingNote(p: { deletesAfter: string | null; bookedCount: number }) {
  const n = p.bookedCount;
  // No booked session left: it goes at the next hourly run.
  if (!n) return 'Hidden from mentees. Deleted within the hour.';
  const when = p.deletesAfter
    ? ` on ${new Date(p.deletesAfter).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : '';
  return `Hidden from mentees. Deleted after its last booked session${when}. The ${n} booked session${n === 1 ? ' goes' : 's go'} ahead.`;
}

/**
 * The owner's card for one of their types. The stage and venue come from the
 * public profile while the type is visible; a hidden one has none there.
 */
export function toOwnerCard(
  t: OwnSessionType,
  shown: ProfileSessionType | undefined,
  keeping: boolean,
): OwnerSessionCard {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    durationMin: t.durationMin,
    questions: shown?.questions ?? [],
    category: t.topics[0]?.label ?? null,
    stage: shown?.stage ?? null,
    venue: shown?.venue ?? '',
    visible: t.isLive && !t.pendingDeletion,
    pendingNote: t.pendingDeletion ? profilePendingNote(t.pendingDeletion) : null,
    keeping,
  };
}

type Props = {
  /** What mentees see: shown until the owner's own list arrives, or if it fails. */
  shown: ProfileSessionType[];
};

/**
 * The Sessions tab as its owner sees it (Mentor Profile.dc.html `canEdit`):
 * every type they own, hidden ones greyed, each with its controls, and a
 * "New session type" tile. Quick edit changes length and visibility here;
 * everything else is in Session types.
 */
export function OwnerSessionTypes({ shown }: Props) {
  const own = useOwnSessionTypes(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [said, setSaid] = useState<{ text: string; id: number } | null>(null);
  const say = (text: string) => setSaid({ text, id: Date.now() });
  const quick = useQuickEditSessionType();
  const restore = useRestoreSessionType(
    () => say('That didn’t save. Try again.'),
    (_id, r) =>
      say(r === 'kept' ? 'Kept. It stays hidden until you show it.' : 'It was already deleted.'),
  );

  const list = own.data;
  const cards = list?.map((t) =>
    toOwnerCard(
      t,
      shown.find((s) => s.id === t.id),
      restore.pendingIds.includes(t.id),
    ),
  );
  const target = list?.find((t) => t.id === editing) ?? null;
  const closeEdit = () => {
    quick.reset();
    setEditing(null);
  };

  return (
    <>
      {own.error && (
        <Notice tone="neutral" icon="error">
          We couldn’t load your hidden session types.{' '}
          <Button variant="text" onClick={own.retry}>
            Try again
          </Button>
        </Notice>
      )}
      <SessionTypeList
        sessionTypes={shown}
        onBook={() => undefined}
        bookBlocked={null}
        canBook={false}
        owner={
          cards
            ? {
                cards,
                // PENDING: the show/hide and delete confirms, shared with
                // Session types once they move to organisms.
                onToggle: () => undefined,
                onDelete: () => undefined,
                onEdit: setEditing,
                onKeep: restore.restore,
                newHref: '/session-types/new',
              }
            : undefined
        }
      />
      {target && (
        <ModalShell
          title={`Edit ${target.name}`}
          subtitle="Changes show on your profile straight away."
          icon="edit"
          size="md"
          onClose={closeEdit}
        >
          <SessionTypeQuickEdit
            initial={{ durationMin: target.durationMin, visible: target.isLive }}
            fullHref={`/session-types/${encodeURIComponent(target.id)}/edit`}
            saving={quick.isPending}
            error={quick.error?.copy ?? null}
            onCancel={closeEdit}
            onSave={(changed) =>
              quick.mutate(
                { id: target.id, durationMin: changed.durationMin, live: changed.visible },
                {
                  onSuccess: () => {
                    closeEdit();
                    say(`${target.name} saved.`);
                  },
                },
              )
            }
          />
        </ModalShell>
      )}
      <LiveRegion message={said} />
    </>
  );
}
