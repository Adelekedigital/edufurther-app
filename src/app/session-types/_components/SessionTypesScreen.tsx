'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import {
  DeleteConfirm,
  FeatureConfirm,
  VisibilityConfirm,
  type ConfirmShell,
} from '@/components/organisms/SessionTypeConfirms/SessionTypeConfirms';
import { SessionTypeManager } from '@/components/organisms/SessionTypeManager/SessionTypeManager';
import { AppShell } from '@/components/templates/AppShell/AppShell';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { useRouter } from 'next/navigation';
import { useTopics } from '@/lib/api/data/mentors';
import { useDuplicateSessionType } from '@/lib/api/data/sessionTypeEdit';
import {
  useDeleteSessionType,
  useOwnSessionTypes,
  useRestoreSessionType,
  useSetFeatured,
  useSetLive,
} from '@/lib/api/data/sessionTypes';
import { formatShortDate } from '@/lib/utils/format';
import { SESSION_TEMPLATES, templateHint } from '@/lib/utils/sessionTemplates';
import { useLatest } from '@/lib/utils/useLatest';
import { useOnline } from '@/lib/utils/useOnline';
import type { Remote } from '@/types/mentor';
import type { DeleteError, OwnSessionType } from '@/types/sessionType';
import { useAppShell } from '../../_shell/useAppShell';
import { mentorGate } from './MentorGate';
import styles from './SessionTypesScreen.module.css';

const CREATE_HREF = '/session-types/new';
const TEMPLATES = SESSION_TEMPLATES.map((t) => ({
  key: t.key,
  href: `${CREATE_HREF}?template=${t.key}`,
  icon: t.icon,
  name: t.name,
  hint: templateHint(t),
}));

const confirmShell = (shell: ConfirmShell, body: ReactNode) => (
  <ModalShell {...shell} size="sm">
    {body}
  </ModalShell>
);

/** /session-types — the mentor's own session types (Session Types.dc.html, List). */
export function SessionTypesScreen() {
  const { viewer, member, chrome, account, nav } = useAppShell();
  const online = useOnline();
  const isMentor = !!member?.isMentor;
  const remote = useOwnSessionTypes(isMentor);
  // Until we know who this is, the list is loading — never "no session types".
  const list: Remote<OwnSessionType[]> =
    viewer.kind === 'loading' ? { ...remote, isLoading: true } : remote;

  const [messages, setMessages] = useState<Record<string, string>>({});
  const clearMessage = (id: string) => setMessages(({ [id]: _cleared, ...rest }) => rest);
  // Everything a row says, and what an action did, is read out from one region.
  const [announcement, setAnnouncement] = useState<{ text: string; id: number } | null>(null);
  const announce = useCallback(
    (text: string) => setAnnouncement((a) => ({ text, id: (a?.id ?? 0) + 1 })),
    [],
  );
  // Rows whose message is progress or success (not an error); a switch's
  // messages always clear this, so a failed save never looks like a note.
  const [infoIds, setInfoIds] = useState<string[]>([]);
  const onLiveFailed = useCallback(
    (id: string, live: boolean) => {
      // Copy confirmed by design (reply 2026-09-29, #2).
      const text = `Couldn’t ${live ? 'make it live' : 'hide it'}. Check your connection and try again.`;
      setInfoIds((ids) => ids.filter((x) => x !== id));
      setMessages((m) => ({ ...m, [id]: text }));
      announce(text);
    },
    [announce],
  );
  const setLive = useSetLive(onLiveFailed);
  const onLiveChange = (id: string, live: boolean) => {
    setMessages(({ [id]: _cleared, ...rest }) => rest);
    setInfoIds((ids) => ids.filter((x) => x !== id));
    setLive(id, live);
  };
  // The switch asks first (Session Types.dc.html `toggle`): showing and hiding
  // each confirm, and hiding the last visible type says what that means.
  const [visibility, setVisibility] = useState<{ type: OwnSessionType; show: boolean } | null>(
    null,
  );
  const askVisibility = (id: string, show: boolean) => {
    const t = list.data?.find((x) => x.id === id);
    if (t) setVisibility({ type: t, show });
  };
  const lastVisible =
    !!visibility && !visibility.show && (list.data ?? []).filter((x) => x.isLive).length === 1;

  const router = useRouter();
  const { topics, isLoading: topicsLoading } = useTopics();
  const dup = useDuplicateSessionType();
  const say = (id: string, text: string, info: boolean) => {
    setMessages((m) => ({ ...m, [id]: text }));
    announce(text);
    setInfoIds((ids) =>
      info ? [...ids.filter((x) => x !== id), id] : ids.filter((x) => x !== id),
    );
  };
  // Copy confirmed by design throughout (reply 2026-09-29, #9) (the design only adds the row).
  const onDuplicate = (t: OwnSessionType) => {
    if (dup.isPending) return say(t.id, 'Still copying the last one. Try again in a moment.', true);
    // The copy's topics come from the catalog: without it they'd be dropped.
    if (topicsLoading) return say(t.id, 'Still loading your topics. Try again in a moment.', true);
    const offeringIds = Object.fromEntries(topics.flatMap((x) => (x.id ? [[x.slug, x.id]] : [])));
    say(t.id, `Copying “${t.name}”…`, true);
    dup.duplicate({ id: t.id, takenNames: (list.data ?? []).map((x) => x.name), offeringIds }).then(
      (d) => {
        const missed = [
          d.failed.includes('topics') && 'its topics',
          d.failed.includes('hours') && 'its dedicated hours',
        ].filter(Boolean);
        if (d.failed.includes('hidden'))
          say(
            t.id,
            `“${d.name}” was added, but it isn’t hidden yet: mentees can book it. Hide it, then check it.`,
            false,
          );
        else if (missed.length)
          say(
            t.id,
            `“${d.name}” was added, hidden, but ${missed.join(' and ')} didn’t copy. Check it before you show it.`,
            false,
          );
        else say(t.id, `“${d.name}” was added, hidden. Check it, then show it to mentees.`, true);
      },
      (e: { message: string }) => say(t.id, e.message, false),
    );
  };
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  // Only once we know whose profile it is (no broken link while the account loads).
  // /me carries no profile slug, so the id: the profile route takes either.
  const shareUrl = (t: OwnSessionType) =>
    member
      ? `${origin}/mentors/${encodeURIComponent(member.id)}?book=${encodeURIComponent(t.id)}`
      : null;

  const [confirming, setConfirming] = useState<OwnSessionType | null>(null);
  // Read when a delete answers: another row's confirm may be open by then.
  const confirmingRef = useLatest(confirming);
  const del = useDeleteSessionType();
  const closeConfirm = () => {
    setConfirming(null);
    del.reset();
  };
  // Closed (×) while its delete was out: the delete carries on, and the row
  // says how it went, a refusal included (product, 2026-10-01).
  // By row: a dismissed delete must not close, or show its state in, another
  // row's confirm opened meanwhile (Codex on #121).
  const dismissed = useRef(new Set<string>());
  // The row the delete hook's refusal belongs to, and every delete still out,
  // by row: the hook only tracks its latest call, and a reset (another row's
  // Keep it) would make a row whose delete is still out look idle.
  const [deleteFor, setDeleteFor] = useState<string | null>(null);
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);
  const settleDelete = (id: string) => setPendingDeletes((ids) => ids.filter((x) => x !== id));
  const dismissConfirm = () => {
    if (confirming) dismissed.current.add(confirming.id);
    setConfirming(null);
  };
  // A removed row takes its buttons with it: focus the next row's "⋯", or Create.
  const [focusAfterRemoval, setFocusAfterRemoval] = useState<{ menuOf: string } | 'create' | null>(
    null,
  );
  const onFocused = useCallback(() => setFocusAfterRemoval(null), []);
  // Focus moves on after a removal, unless another row's confirm is open: focus
  // is in that dialog, and its close returns focus to its own row (Codex on #121).
  const moveFocusAfter = (after: { menuOf: string } | 'create', id: string) => {
    if (confirmingRef.current && confirmingRef.current.id !== id) return;
    setFocusAfterRemoval(after);
  };
  // A delete that couldn't be confirmed: if the refetched list no longer has
  // it, focus moves on as after a delete (adjusted during render).
  const [unconfirmed, setUnconfirmed] = useState<{
    id: string;
    after: { menuOf: string } | 'create';
  } | null>(null);
  if (unconfirmed && list.data && !list.data.some((x) => x.id === unconfirmed.id)) {
    setUnconfirmed(null);
    // Any open confirm owns focus, this row's too: reopened before the refetch.
    if (!confirming) setFocusAfterRemoval(unconfirmed.after);
  }
  const neighbour = (id: string): { menuOf: string } | 'create' => {
    const rows = list.data ?? [];
    const i = rows.findIndex((x) => x.id === id);
    const next = rows[i + 1] ?? rows[i - 1];
    return next ? { menuOf: next.id } : 'create';
  };
  const onDelete = (t: OwnSessionType) => {
    const after = neighbour(t.id);
    dismissed.current.delete(t.id);
    setDeleteFor(t.id);
    setPendingDeletes((ids) => [...ids, t.id]);
    void del
      .remove(t.id)
      .then((r) => {
        settleDelete(t.id);
        // Only this row's confirm: another may have opened since a dismiss.
        setConfirming((c) => (c?.id === t.id ? null : c));
        dismissed.current.delete(t.id);
        clearMessage(t.id);
        // PROVISIONAL copy: no answer in time; the refetched list shows what happened.
        if (r.kind === 'unknown') {
          setUnconfirmed({ id: t.id, after });
          announce('We couldn’t confirm the delete. The list has been refreshed.');
        } else if (r.kind === 'deleted') {
          moveFocusAfter(after, t.id);
          announce(`“${t.name}” was deleted.`);
        } else
          announce(
            r.deletesAfter
              ? `Deletion scheduled for ${formatShortDate(r.deletesAfter)}. Hidden from mentees now.`
              : 'Deletion scheduled. Hidden from mentees now.',
          );
      })
      .catch((e: DeleteError) => {
        settleDelete(t.id);
        // The confirm shows a refusal; once dismissed, the row does.
        if (!dismissed.current.delete(t.id)) return;
        say(t.id, e.message, false);
      });
  };

  // Featured: one at a time; featuring another asks first (design `feature` confirm).
  // Copy confirmed by design throughout (reply 2026-09-29, #10). A hidden type
  // isn't offered "Mark as featured"; the server still refuses one hidden
  // elsewhere meanwhile, and that refusal says why.
  const HIDDEN_FEATURE = 'Show it to mentees first: a hidden session type can’t be featured.';
  const setFeatured = useSetFeatured((id, featured, e) =>
    say(
      id,
      e.kind === 'offline'
        ? `Couldn’t ${featured ? 'feature it' : 'remove it from featured'}. Check your connection and try again.`
        : featured && e.kind === 'validation'
          ? HIDDEN_FEATURE
          : `Couldn’t ${featured ? 'feature it' : 'remove it from featured'}. Try again in a moment.`,
      false,
    ),
  );
  const [featuring, setFeaturing] = useState<{
    type: OwnSessionType;
    current: OwnSessionType;
  } | null>(null);
  const onFeature = (t: OwnSessionType, featured: boolean) => {
    clearMessage(t.id);
    const current = (list.data ?? []).find((x) => x.isFeatured && x.id !== t.id);
    if (featured && current) return setFeaturing({ type: t, current });
    setFeatured(t.id, featured);
  };
  // Name and focus target per row, taken at the click: a row the hourly job
  // already deleted is gone from the list by the time its answer arrives.
  const keeping = useRef(new Map<string, { name: string; after: { menuOf: string } | 'create' }>());
  const restore = useRestoreSessionType(
    (id, e) => {
      keeping.current.delete(id);
      say(
        id,
        e.kind === 'offline'
          ? 'Couldn’t keep it. Check your connection and try again.'
          : 'Couldn’t keep it. Try again in a moment.',
        false,
      );
    },
    // Hook level, not per call: with two rows kept at once, only the latest
    // call's own callbacks would run (review r3 of #80).
    (id, r) => {
      const k = keeping.current.get(id);
      keeping.current.delete(id);
      if (!k) return;
      if (r === 'kept') return announce(`Kept. “${k.name}” is hidden until you show it.`);
      // The hourly job got there first.
      setFocusAfterRemoval(k.after);
      announce(`“${k.name}” was already deleted.`);
    },
  );
  const onRestore = (t: OwnSessionType) => {
    if (restore.pendingIds.includes(t.id)) return;
    clearMessage(t.id);
    keeping.current.set(t.id, { name: t.name, after: neighbour(t.id) });
    restore.restore(t.id);
  };

  const body: ReactNode = mentorGate(viewer, isMentor, '/session-types') ?? (
    <SessionTypeManager
      list={list}
      messages={messages}
      infoIds={infoIds}
      onLiveChange={askVisibility}
      onDelete={(t) => {
        clearMessage(t.id);
        setConfirming(t);
      }}
      onEdit={(t) => router.push(`/session-types/${encodeURIComponent(t.id)}/edit`)}
      onFeature={onFeature}
      onRestore={onRestore}
      restoringIds={restore.pendingIds}
      focusAfterRemoval={focusAfterRemoval}
      onFocused={onFocused}
      onDuplicate={onDuplicate}
      shareUrl={shareUrl}
      createHref={CREATE_HREF}
      templates={TEMPLATES}
    />
  );

  return (
    <AppShell active="Sessions" nav={nav} chrome={chrome} account={account} offline={!online}>
      {body}
      {visibility && (
        <VisibilityConfirm
          renderShell={confirmShell}
          type={visibility.type}
          show={visibility.show}
          last={lastVisible}
          onCancel={() => setVisibility(null)}
          onConfirm={() => {
            onLiveChange(visibility.type.id, visibility.show);
            setVisibility(null);
          }}
        />
      )}
      {featuring && (
        <FeatureConfirm
          renderShell={confirmShell}
          type={featuring.type}
          current={featuring.current}
          onCancel={() => setFeaturing(null)}
          onConfirm={() => {
            setFeatured(featuring.type.id, true);
            setFeaturing(null);
          }}
        />
      )}
      {confirming && (
        <DeleteConfirm
          renderShell={confirmShell}
          type={confirming}
          busy={pendingDeletes.includes(confirming.id)}
          error={deleteFor === confirming.id ? del.error : null}
          onKeep={closeConfirm}
          onDismiss={dismissConfirm}
          onDelete={() => onDelete(confirming)}
        />
      )}
      <LiveRegion message={announcement} />
    </AppShell>
  );
}
