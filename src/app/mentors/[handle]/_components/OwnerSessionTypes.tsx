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
import { useDeleteSessionType, useOwnSessionTypes, useSetLive } from '@/lib/api/data/sessionTypes';
import { formatShortDate } from '@/lib/utils/format';
import { stageText } from '@/lib/utils/stageText';
import type { OwnerSessionCard, ProfileSessionType } from '@/types/mentor';
import type { OwnSessionType } from '@/types/sessionType';

const NEW_HREF = '/session-types/new';
/** Where a hidden type comes back, said wherever the profile hides one. */
const SHOW_AGAIN = 'To show it again, turn it on in Session types.';

const confirmShell = (shell: ConfirmShell, body: ReactNode) => (
  <ModalShell {...shell} size="sm">
    {body}
  </ModalShell>
);

/**
 * The owner's card for one of their active types: the public profile's row
 * says it best (the mentor's own stage wording included); Session types'
 * stages fill in until the profile has refetched.
 */
export function toOwnerCard(
  t: OwnSessionType,
  shown: ProfileSessionType | undefined,
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
    visible: true,
    pendingNote: null,
    keeping: false,
  };
}

type Props = {
  /** What mentees see: shown until the owner's own list arrives, or if it fails. */
  shown: ProfileSessionType[];
};

/**
 * The Sessions tab as its owner sees it (Mentor Profile.dc.html `canEdit`):
 * their active types, as mentees see them, each with its switch, Edit and
 * Delete, and a "New session type" tile. Product 2026-09-30: only active types
 * here. A hidden or scheduled type leaves the profile and is managed in Session
 * types, which the hide confirm says. The confirms are Session types' own, so
 * each action asks the same way wherever it's done.
 */
export function OwnerSessionTypes({ shown }: Props) {
  const own = useOwnSessionTypes(true);
  // Active only: hidden and scheduled types are Session types' business.
  const list = own.data?.filter((t) => t.isLive && !t.pendingDeletion);
  const liveCount = list?.length ?? 0;
  const [said, setSaid] = useState<{ text: string; id: number } | null>(null);
  const say = (text: string) => setSaid((was) => ({ text, id: (was?.id ?? 0) + 1 }));

  // A card that leaves (hidden, deleted or scheduled) takes its buttons with
  // it: focus the next card's Edit, or the "New session type" tile. A count,
  // so two in a row still move focus.
  const [focusAfter, setFocusAfter] = useState<{ edit: string | null; n: number } | null>(null);
  useEffect(() => {
    if (!focusAfter) return;
    const label = focusAfter.edit && `Edit ${focusAfter.edit}`;
    const edit = [...document.querySelectorAll<HTMLElement>('button[aria-label]')].find(
      (b) => b.getAttribute('aria-label') === label,
    );
    (edit ?? document.querySelector<HTMLElement>(`a[href="${NEW_HREF}"]`))?.focus();
  }, [focusAfter]);
  const leaving = (t: OwnSessionType, text: string) => {
    const rows = list ?? [];
    const i = rows.findIndex((x) => x.id === t.id);
    const next = rows[i + 1] ?? rows[i - 1];
    setFocusAfter((f) => ({ edit: next?.name ?? null, n: (f?.n ?? 0) + 1 }));
    say(text);
  };
  const hiddenNow = (t: OwnSessionType) =>
    `“${t.name}” is hidden. You can show it again in Session types.`;

  // The switch: optimistic, and a refusal says so (Session types' copy).
  const setLive = useSetLive((_id, live) =>
    say(`Couldn’t ${live ? 'make it live' : 'hide it'}. Check your connection and try again.`),
  );
  // Hiding asks first; `then` is a quick edit's save waiting on it.
  const [hiding, setHiding] = useState<{ type: OwnSessionType; then?: QuickEdit } | null>(null);

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
        if (save.live === false) leaving(t, hiddenNow(t));
        else say(`“${t.name}” saved.`);
      },
    });

  const del = useDeleteSessionType();
  const [deleting, setDeleting] = useState<OwnSessionType | null>(null);
  const closeDelete = () => {
    setDeleting(null);
    del.reset();
  };
  const onDelete = (t: OwnSessionType) => {
    void del
      .remove(t.id)
      .then((r) => {
        closeDelete();
        if (r.kind === 'deleted') return leaving(t, `“${t.name}” was deleted.`);
        const when = r.deletesAfter
          ? `Deletion scheduled for ${formatShortDate(r.deletesAfter)}.`
          : 'Deletion scheduled.';
        leaving(t, `${when} Hidden from mentees now. Manage it in Session types.`);
      })
      .catch(() => undefined);
  };

  const cards = list?.map((t) =>
    toOwnerCard(
      t,
      shown.find((s) => s.id === t.id),
    ),
  );

  return (
    <>
      {own.error && (
        <Notice tone="neutral" icon="error">
          We couldn’t load your session types for editing.{' '}
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
                // Every card here is visible: the switch only hides.
                onToggle: (id) => {
                  const t = list?.find((x) => x.id === id);
                  if (t) setHiding({ type: t });
                },
                onDelete: (id) => setDeleting(list?.find((x) => x.id === id) ?? null),
                onEdit: setEditing,
                onKeep: () => undefined,
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
              // Hiding asks first, as the switch does: it leaves the profile.
              if (changed.visible === false) {
                setEditing(null);
                setHiding({ type: target, then: save });
              } else saveQuick(target, save);
            }}
          />
        </ModalShell>
      )}
      {hiding && (
        <VisibilityConfirm
          renderShell={confirmShell}
          type={hiding.type}
          show={false}
          last={liveCount === 1}
          subtitle={
            liveCount === 1
              ? `Your profile will show “Not taking bookings” until one is visible again. Booked sessions go ahead. ${SHOW_AGAIN}`
              : `It leaves your profile and Explore, and mentees can’t book it. Booked sessions go ahead. ${SHOW_AGAIN}`
          }
          onCancel={() => setHiding(null)}
          onConfirm={() => {
            const { type, then } = hiding;
            setHiding(null);
            if (then) return saveQuick(type, then);
            setLive(type.id, false);
            leaving(type, hiddenNow(type));
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
