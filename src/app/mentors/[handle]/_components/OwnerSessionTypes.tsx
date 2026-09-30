'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { Button } from '@/components/atoms/Button/Button';
import { Notice } from '@/components/molecules/Notice/Notice';
import {
  DeleteConfirm,
  VisibilityConfirm,
  type ConfirmShell,
} from '@/components/organisms/SessionTypeConfirms/SessionTypeConfirms';
import { SessionTypeList } from '@/components/organisms/SessionTypeList/SessionTypeList';
import { SessionTypeQuickEdit } from '@/components/organisms/SessionTypeQuickEdit/SessionTypeQuickEdit';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { useQuickEditSessionType, type QuickEdit } from '@/lib/api/data/sessionTypeQuick';
import {
  useDeleteSessionType,
  useOwnSessionTypes,
  useRestoreSessionType,
  useSetLive,
} from '@/lib/api/data/sessionTypes';
import { formatShortDate } from '@/lib/utils/format';
import { stageText } from '@/lib/utils/stageText';
import type { OwnerSessionCard, ProfileSessionType } from '@/types/mentor';
import type { OwnSessionType } from '@/types/sessionType';

const NEW_HREF = '/session-types/new';

const confirmShell = (shell: ConfirmShell, body: ReactNode) => (
  <ModalShell {...shell} size="sm">
    {body}
  </ModalShell>
);

/**
 * Design `pendingNote` (Mentor Profile.dc.html): "Hidden from mentees. Deleted
 * after its last booked session on Oct 14. The 2 booked sessions go ahead."
 */
export function profilePendingNote(p: { deletesAfter: string | null; bookedCount: number }) {
  const n = p.bookedCount;
  // No booked session left: it goes at the next hourly run.
  if (!n) return 'Hidden from mentees. Deleted within the hour.';
  const when = p.deletesAfter ? ` on ${formatShortDate(p.deletesAfter)}` : '';
  return `Hidden from mentees. Deleted after its last booked session${when}. The ${n} booked session${n === 1 ? ' goes' : 's go'} ahead.`;
}

/**
 * The owner's card for one of their types. While it's visible the public
 * profile's row says it best (the mentor's own stage wording included); a
 * hidden one reads its stages from Session types.
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
    stage: shown?.stage ?? stageText(t.stages, null),
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
 * "New session type" tile. The switch, Delete and hiding the last visible type
 * ask first with Session types' own confirms, so each action asks the same way
 * wherever it's done. Quick edit changes length and visibility; everything
 * else is in Session types.
 */
export function OwnerSessionTypes({ shown }: Props) {
  const own = useOwnSessionTypes(true);
  const list = own.data;
  const [said, setSaid] = useState<{ text: string; id: number } | null>(null);
  const say = (text: string) => setSaid((was) => ({ text, id: (was?.id ?? 0) + 1 }));

  // The switch: optimistic, and a refusal says so (Session types' copy).
  const setLive = useSetLive((_id, live) =>
    say(`Couldn’t ${live ? 'make it live' : 'hide it'}. Check your connection and try again.`),
  );
  const liveCount = (list ?? []).filter((t) => t.isLive && !t.pendingDeletion).length;
  // Show or hide asks first; `then` is a quick edit's save waiting on it.
  const [visibility, setVisibility] = useState<{
    type: OwnSessionType;
    show: boolean;
    then?: QuickEdit;
  } | null>(null);

  const quick = useQuickEditSessionType();
  const [editing, setEditing] = useState<string | null>(null);
  const target = list?.find((t) => t.id === editing) ?? null;
  const closeEdit = () => {
    quick.reset();
    setEditing(null);
  };
  const saveQuick = (t: OwnSessionType, save: QuickEdit) =>
    quick.mutate(save, {
      onSuccess: () => {
        closeEdit();
        say(`“${t.name}” saved.`);
      },
    });

  const del = useDeleteSessionType();
  const [deleting, setDeleting] = useState<OwnSessionType | null>(null);
  const closeDelete = () => {
    setDeleting(null);
    del.reset();
  };
  // A deleted card takes its buttons with it: focus the next card's Edit, or
  // the "New session type" tile.
  // A count, so deleting twice in a row still moves focus.
  const [focusAfter, setFocusAfter] = useState<{ edit: string | null; n: number } | null>(null);
  useEffect(() => {
    if (!focusAfter) return;
    const label = focusAfter.edit && `Edit ${focusAfter.edit}`;
    const edit = [...document.querySelectorAll<HTMLElement>('button[aria-label]')].find(
      (b) => b.getAttribute('aria-label') === label,
    );
    (edit ?? document.querySelector<HTMLElement>(`a[href="${NEW_HREF}"]`))?.focus();
  }, [focusAfter]);
  const onDelete = (t: OwnSessionType) => {
    const rows = list ?? [];
    const i = rows.findIndex((x) => x.id === t.id);
    const next = rows[i + 1] ?? rows[i - 1];
    void del
      .remove(t.id)
      .then((r) => {
        closeDelete();
        if (r.kind === 'deleted') {
          // A scheduled card stays, with "Keep it" where the controls were.
          setFocusAfter((f) => ({
            edit: next && !next.pendingDeletion ? next.name : null,
            n: (f?.n ?? 0) + 1,
          }));
          say(`“${t.name}” was deleted.`);
        } else
          say(
            r.deletesAfter
              ? `Deletion scheduled for ${formatShortDate(r.deletesAfter)}. Hidden from mentees now.`
              : 'Deletion scheduled. Hidden from mentees now.',
          );
      })
      .catch(() => undefined);
  };

  const restore = useRestoreSessionType(
    () => say('That didn’t save. Try again.'),
    (id, r) => {
      const name = list?.find((t) => t.id === id)?.name ?? 'It';
      say(
        r === 'kept'
          ? `Kept. “${name}” is hidden until you show it.`
          : `“${name}” was already deleted.`,
      );
    },
  );

  const cards = list?.map((t) =>
    toOwnerCard(
      t,
      shown.find((s) => s.id === t.id),
      restore.pendingIds.includes(t.id),
    ),
  );

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
                onToggle: (id, show) => {
                  const t = list?.find((x) => x.id === id);
                  if (t) setVisibility({ type: t, show });
                },
                onDelete: (id) => setDeleting(list?.find((x) => x.id === id) ?? null),
                onEdit: setEditing,
                onKeep: restore.restore,
                newHref: NEW_HREF,
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
            onSave={(changed) => {
              const save = {
                id: target.id,
                durationMin: changed.durationMin,
                live: changed.visible,
              };
              // Hiding the last visible type says what that means first (design `hideLast`).
              if (changed.visible === false && target.isLive && liveCount === 1) {
                setEditing(null);
                setVisibility({ type: target, show: false, then: save });
              } else saveQuick(target, save);
            }}
          />
        </ModalShell>
      )}
      {visibility && (
        <VisibilityConfirm
          renderShell={confirmShell}
          type={visibility.type}
          show={visibility.show}
          last={!visibility.show && visibility.type.isLive && liveCount === 1}
          onCancel={() => setVisibility(null)}
          onConfirm={() => {
            const { type, show, then } = visibility;
            setVisibility(null);
            if (then) saveQuick(type, then);
            else setLive(type.id, show);
          }}
        />
      )}
      {deleting && (
        <DeleteConfirm
          renderShell={confirmShell}
          type={deleting}
          busy={del.isPending}
          error={del.error}
          onKeep={closeDelete}
          onDelete={() => onDelete(deleting)}
        />
      )}
      <LiveRegion message={said} />
    </>
  );
}
