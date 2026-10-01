'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { Button } from '@/components/atoms/Button/Button';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
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
import type { ProfileSessionType } from '@/types/mentor';
import type { OwnSessionType } from '@/types/sessionType';
import styles from './MentorProfileScreen.module.css';

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
function toCard(t: OwnSessionType, shown: ProfileSessionType | undefined): ProfileSessionType {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    durationMin: t.durationMin,
    questions: shown?.questions ?? [],
    category: t.topics[0]?.label ?? null,
    stage: shown?.stage ?? stageText(t.stages, null),
    venue: shown?.venue ?? '',
  };
}

type Props = {
  /** What mentees see: shown if the owner's own list fails. */
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
  const nameOf = (id: string) => own.data?.find((t) => t.id === id)?.name ?? 'it';
  const [said, setSaid] = useState<{ text: string; id: number } | null>(null);
  const say = (text: string) => setSaid((was) => ({ text, id: (was?.id ?? 0) + 1 }));

  // A card that leaves (hidden, deleted or scheduled) takes its buttons with
  // it: focus the next card's Edit, or the "New session type" tile. By id, so
  // two types with one name can't confuse it; a count, so two in a row still
  // move focus.
  const [focusAfter, setFocusAfter] = useState<{ id: string | null; n: number } | null>(null);
  useEffect(() => {
    if (!focusAfter) return;
    const card = [...document.querySelectorAll<HTMLElement>('[data-session-type-id]')].find(
      (c) => c.dataset.sessionTypeId === focusAfter.id,
    );
    const edit = card?.querySelector<HTMLElement>('button[aria-label^="Edit "]');
    (edit ?? document.querySelector<HTMLElement>(`a[href="${NEW_HREF}"]`))?.focus();
  }, [focusAfter]);
  const leaving = (t: OwnSessionType, text: string) => {
    const rows = list ?? [];
    const i = rows.findIndex((x) => x.id === t.id);
    const next = rows[i + 1] ?? rows[i - 1];
    setFocusAfter((f) => ({ id: next?.id ?? null, n: (f?.n ?? 0) + 1 }));
    say(text);
  };
  const hiddenNow = (t: OwnSessionType) =>
    `“${t.name}” is hidden. You can show it again in Session types.`;

  // The switch: optimistic; a refusal brings the card back and says which.
  const setLive = useSetLive((id, live) =>
    say(
      `Couldn’t ${live ? 'make' : 'hide'} “${nameOf(id)}”${live ? ' live' : ''}. Check your connection and try again.`,
    ),
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
      // A hide is saved after the modal has closed, so it can't show the
      // error: say it, and leave nothing behind for the next Edit (review of
      // PR 119). A length save keeps the modal and its error.
      onError: (e) => {
        if (save.live !== false) return;
        say(`Couldn’t hide “${t.name}”. ${e.copy}`);
        quick.reset();
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
    toCard(
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
      {own.isLoading ? (
        // The owner's list: card-sized placeholders, so the controls never
        // pop in over the mentee view (review of PR 119).
        <ul className={styles.ownerLoading} aria-busy>
          <span className="sr-only" role="status">
            Loading your session types
          </span>
          {Array.from({ length: Math.max(1, shown.length) }, (_, i) => (
            <li key={i}>
              <Skeleton width="100%" height="240px" radius="lg" />
            </li>
          ))}
        </ul>
      ) : cards ? (
        <SessionTypeList
          owner={{
            cards,
            onHide: (id) => {
              const t = list?.find((x) => x.id === id);
              if (t) setHiding({ type: t });
            },
            onDelete: (id) => setDeleting(list?.find((x) => x.id === id) ?? null),
            onEdit: setEditing,
            newHref: NEW_HREF,
          }}
        />
      ) : (
        // The owner's list failed: what mentees see, with the retry above.
        <SessionTypeList
          sessionTypes={shown}
          onBook={() => undefined}
          bookBlocked={null}
          canBook={false}
        />
      )}
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
                closeEdit();
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
          onCancel={() => {
            const { type, then } = hiding;
            setHiding(null);
            // "Keep visible" keeps the type, not the rest of the edit away:
            // a length changed in quick edit still saves (review of PR 119).
            if (then?.durationMin !== undefined) saveQuick(type, { ...then, live: undefined });
          }}
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
