'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
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
import { useLatest } from '@/lib/utils/useLatest';
import type { ProfileSessionType } from '@/types/mentor';
import type { DeleteError, OwnSessionType } from '@/types/sessionType';
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
    stage: shown?.stage ?? stageText(t.stages, t.customStage),
    venue: shown?.venue ?? '',
  };
}

type Props = {
  /** What mentees see: shown if the owner's own list fails. */
  shown: ProfileSessionType[];
  /**
   * The number of active types, as this list has it: the tab's count follows
   * it, so a hide shows in both at once (Codex on PR 119). Null until loaded.
   */
  onActiveCount?: (n: number | null) => void;
  /**
   * Says an outcome in the screen's live region, which outlives this tab: a
   * delete still out when the owner switches tab is still said (Codex on PR 130).
   */
  onSay: (text: string) => void;
};

/**
 * The Sessions tab as its owner sees it (Mentor Profile.dc.html `canEdit`):
 * their active types, as mentees see them, each with its switch, Edit and
 * Delete, and a "New session type" tile. Product 2026-09-30: only active types
 * here. A hidden or scheduled type leaves the profile and is managed in Session
 * types, which the hide confirm says. The confirms are Session types' own, so
 * each action asks the same way wherever it's done.
 */
export function OwnerSessionTypes({ shown, onActiveCount, onSay: say }: Props) {
  const own = useOwnSessionTypes(true);
  // Active only: hidden and scheduled types are Session types' business.
  const list = own.data?.filter((t) => t.isLive && !t.pendingDeletion);
  const liveCount = list?.length ?? 0;
  const activeCount = list ? list.length : null;
  useEffect(() => {
    onActiveCount?.(activeCount);
  }, [activeCount, onActiveCount]);
  const nameOf = (id: string) => own.data?.find((t) => t.id === id)?.name ?? 'it';

  // A card that leaves (hidden, deleted or scheduled) takes its buttons with
  // it: focus the next card's Edit, or the "New session type" tile. By id, so
  // two types with one name can't confuse it; a count, so two in a row still
  // move focus.
  const [focusAfter, setFocusAfter] = useState<{ id: string | null; n: number } | null>(null);
  useEffect(() => {
    if (!focusAfter) return;
    // Any dialog open, the page's own included (Remove photo): focus is in it,
    // and it returns focus itself when it closes (Codex on PR 130).
    if (document.querySelector('[aria-modal="true"]')) return;
    const card = [...document.querySelectorAll<HTMLElement>('[data-session-type-id]')].find(
      (c) => c.dataset.sessionTypeId === focusAfter.id,
    );
    const edit = card?.querySelector<HTMLElement>('button[aria-label^="Edit "]');
    (edit ?? document.querySelector<HTMLElement>(`a[href="${NEW_HREF}"]`))?.focus();
  }, [focusAfter]);
  const nextOf = (id: string) => {
    const rows = list ?? [];
    const i = rows.findIndex((x) => x.id === id);
    return (rows[i + 1] ?? rows[i - 1])?.id ?? null;
  };
  const focusOn = (next: string | null) => setFocusAfter((f) => ({ id: next, n: (f?.n ?? 0) + 1 }));
  const leaving = (t: OwnSessionType, text: string) => {
    setUnconfirmed((u) => (u?.id === t.id ? null : u));
    focusOn(nextOf(t.id));
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
  // Its card gone (deleted meanwhile): the editor is closed for good.
  if (editing && list && !target) setEditing(null);
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
      // Every failure is said in the live region (Codex on PR 119). A hide is
      // saved after the modal closed, so it leaves nothing behind for the
      // next Edit (review of PR 119); a length save keeps the modal's error.
      onError: (e) => {
        if (save.live !== false) return say(e.copy);
        say(`Couldn’t hide “${t.name}”. ${e.copy}`);
        quick.reset();
      },
    });

  const del = useDeleteSessionType();
  const [deleting, setDeleting] = useState<OwnSessionType | null>(null);
  // Mid-delete, the × dismisses the confirm: the delete carries on and the
  // live region says how it went, a refusal included (product, 2026-10-01;
  // as Session types). By card, as is what's still out: the hook tracks only
  // its latest call.
  const dismissed = useRef(new Set<string>());
  const [deleteFor, setDeleteFor] = useState<string | null>(null);
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);
  const settleDelete = (id: string) => setPendingDeletes((ids) => ids.filter((x) => x !== id));
  const closeDelete = () => {
    setDeleting(null);
    del.reset();
  };
  const dismissDelete = () => {
    if (deleting) dismissed.current.add(deleting.id);
    setDeleting(null);
  };
  // Which dialog is open now, and for which card, for a delete that ends after
  // its confirm was dismissed: focus moves on unless another card's dialog is
  // open (focus is in it, and it returns focus itself). The card's own close
  // with it (review of PR 130).
  const openNow = useLatest(
    deleting
      ? `delete:${deleting.id}`
      : hiding
        ? `hide:${hiding.type.id}`
        : target
          ? `edit:${target.id}`
          : null,
  );
  // A delete that couldn't be confirmed: if the refetched list no longer has
  // it, focus moves on as after a delete (adjusted during render).
  const [unconfirmed, setUnconfirmed] = useState<{ id: string; next: string | null } | null>(null);
  if (unconfirmed && list && !list.some((x) => x.id === unconfirmed.id)) {
    setUnconfirmed(null);
    if (!deleting && !hiding && !target) focusOn(unconfirmed.next);
  }
  // Opening a card's confirm: one with nothing out starts clean (an old
  // refusal, already said, isn't shown again); one still out owns its outcome
  // again, so it isn't said twice (review of PR 130).
  const askDelete = (id: string) => {
    if (!pendingDeletes.includes(id)) setDeleteFor((f) => (f === id ? null : f));
    dismissed.current.delete(id);
    setDeleting(list?.find((x) => x.id === id) ?? null);
  };
  const onDelete = (t: OwnSessionType) => {
    const next = nextOf(t.id);
    setUnconfirmed((u) => (u?.id === t.id ? null : u));
    dismissed.current.delete(t.id);
    setDeleteFor(t.id);
    setPendingDeletes((ids) => [...ids, t.id]);
    void del
      .remove(t.id)
      .then((r) => {
        settleDelete(t.id);
        dismissed.current.delete(t.id);
        // Only this card's confirm: another may have opened since a dismiss.
        const open = openNow.current;
        const elsewhere = open !== null && !open.endsWith(`:${t.id}`);
        setDeleting((d) => (d?.id === t.id ? null : d));
        // Gone, or leaving the profile: its other dialogs close with it.
        const move = (text: string) => {
          setHiding((x) => (x?.type.id === t.id ? null : x));
          setEditing((x) => (x === t.id ? null : x));
          if (!elsewhere) focusOn(next);
          say(text);
        };
        if (r.kind === 'deleted') return move(`“${t.name}” was deleted.`);
        // No answer in time: the card may still be here; the refetch decides.
        if (r.kind === 'unknown') {
          setUnconfirmed({ id: t.id, next });
          return say('We couldn’t confirm the delete. The list has been refreshed.');
        }
        const when = r.deletesAfter
          ? `Deletion scheduled for ${formatShortDate(r.deletesAfter)}.`
          : 'Deletion scheduled.';
        move(`${when} Hidden from mentees now. Manage it in Session types.`);
      })
      .catch((e: DeleteError) => {
        settleDelete(t.id);
        // The confirm shows a refusal; once dismissed, the live region does.
        if (dismissed.current.delete(t.id)) say(`“${t.name}” wasn’t deleted. ${e.message}`);
      });
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
            onDelete: askDelete,
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
          busy={pendingDeletes.includes(deleting.id)}
          error={deleteFor === deleting.id ? del.error : null}
          // Mid-delete, "Keep it" does nothing (closing can't stop the
          // request); the × or Escape dismisses it and the delete carries on.
          onKeep={() => {
            if (!pendingDeletes.includes(deleting.id)) closeDelete();
          }}
          onDismiss={dismissDelete}
          onDelete={() => onDelete(deleting)}
        />
      )}
    </>
  );
}
