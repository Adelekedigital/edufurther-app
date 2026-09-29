'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { SessionTypeManager } from '@/components/organisms/SessionTypeManager/SessionTypeManager';
import { AppShell } from '@/components/templates/AppShell/AppShell';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { useRouter } from 'next/navigation';
import { useTopics } from '@/lib/api/data/mentors';
import { useDuplicateSessionType } from '@/lib/api/data/sessionTypeEdit';
import { useDeleteSessionType, useOwnSessionTypes, useSetLive } from '@/lib/api/data/sessionTypes';
import { SESSION_TEMPLATES, templateHint } from '@/lib/utils/sessionTemplates';
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
  const onLiveFailed = useCallback((id: string, live: boolean) => {
    setMessages((m) => ({
      ...m,
      // PROVISIONAL copy — design request #2.
      [id]: `Couldn’t ${live ? 'make it live' : 'hide it'}. Check your connection and try again.`,
    }));
  }, []);
  const setLive = useSetLive(onLiveFailed);
  const onLiveChange = (id: string, live: boolean) => {
    setMessages(({ [id]: _cleared, ...rest }) => rest);
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
  // Rows whose message is progress or success (not an error).
  const [infoIds, setInfoIds] = useState<string[]>([]);
  const say = (id: string, text: string, info: boolean) => {
    setMessages((m) => ({ ...m, [id]: text }));
    setInfoIds((ids) =>
      info ? [...ids.filter((x) => x !== id), id] : ids.filter((x) => x !== id),
    );
  };
  // PROVISIONAL copy throughout — design request #9 (the design only adds the row).
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
  const del = useDeleteSessionType();
  const closeConfirm = () => {
    setConfirming(null);
    del.reset();
  };

  const body: ReactNode = mentorGate(viewer, isMentor, '/session-types') ?? (
    <SessionTypeManager
      list={list}
      messages={messages}
      infoIds={infoIds}
      onLiveChange={askVisibility}
      onDelete={setConfirming}
      onEdit={(t) => router.push(`/session-types/${encodeURIComponent(t.id)}/edit`)}
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
      {confirming && (
        <DeleteConfirm
          type={confirming}
          busy={del.isPending}
          error={del.error}
          onKeep={closeConfirm}
          onDelete={() => del.remove(confirming.id, { onSuccess: closeConfirm })}
          onSwitchOff={() => {
            onLiveChange(confirming.id, false);
            closeConfirm();
          }}
        />
      )}
    </AppShell>
  );
}

/**
 * Every destructive action confirms in a danger modal (project rule). Deleting
 * is refused while sessions are booked on it (backend #4): the modal then says
 * so and offers switching it off — the reversible way to stop new bookings.
 */
function DeleteConfirm(p: {
  type: OwnSessionType;
  busy: boolean;
  error: DeleteError | null;
  onKeep: () => void;
  onDelete: () => void;
  onSwitchOff: () => void;
}) {
  if (p.error?.hasBookings) {
    const n = p.error.bookedCount;
    const who = n ? `${n} booked session${n === 1 ? ' is' : 's are'}` : 'Booked sessions are still';
    const next = p.type.isLive
      ? 'Switch it off to stop new bookings. Booked sessions still go ahead.'
      : 'It’s already hidden, so no one new can book it.';
    return (
      // PROVISIONAL state and copy — design request #4.
      <ModalShell
        title="This session type has bookings"
        subtitle={`${who} on “${p.type.name}”, so it can’t be deleted yet. ${next}`}
        icon="event_busy"
        tone="danger"
        size="sm"
        onClose={p.onKeep}
      >
        <div className={styles.buttons}>
          {p.type.isLive ? (
            <>
              <Button size="large" variant="secondary-outlined" fullWidth onClick={p.onKeep}>
                Keep it live
              </Button>
              <Button size="large" fullWidth onClick={p.onSwitchOff}>
                Switch it off
              </Button>
            </>
          ) : (
            <Button size="large" variant="secondary-outlined" fullWidth onClick={p.onKeep}>
              Close
            </Button>
          )}
        </div>
      </ModalShell>
    );
  }
  return (
    <ModalShell
      title="Delete this session type?"
      subtitle={`“${p.type.name}” is removed from your profile and Session types. This can’t be undone.`}
      icon="delete"
      tone="danger"
      size="sm"
      onClose={p.onKeep}
    >
      {p.error && (
        <p role="alert" className={styles.error}>
          {p.error.message}
        </p>
      )}
      <div className={styles.buttons}>
        <Button size="large" variant="secondary-outlined" fullWidth onClick={p.onKeep}>
          Keep it
        </Button>
        <Button size="large" variant="destructive" fullWidth onClick={p.onDelete} busy={p.busy}>
          Delete
        </Button>
      </div>
    </ModalShell>
  );
}

/** Show / hide (Session Types.dc.html `toggle` confirm): not destructive, so blue. */
function VisibilityConfirm(p: {
  type: OwnSessionType;
  show: boolean;
  /** Hiding the only visible type. */
  last: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const title = p.show
    ? `Show “${p.type.name}” to mentees?`
    : p.last
      ? 'Hide your last session type?'
      : `Hide “${p.type.name}” from mentees?`;
  const subtitle = p.show
    ? 'It appears on your profile and Explore, and mentees can book it in your open hours.'
    : p.last
      ? 'Your profile will show “Not taking bookings” until a session type is visible again. Booked sessions go ahead.'
      : 'Mentees can’t see or book it. Booked sessions go ahead, and you can show it again anytime.';
  return (
    <ModalShell
      title={title}
      subtitle={subtitle}
      icon={p.show ? 'visibility' : 'visibility_off'}
      size="sm"
      onClose={p.onCancel}
    >
      <div className={styles.buttons}>
        <Button size="large" variant="secondary-outlined" fullWidth onClick={p.onCancel}>
          {p.show ? 'Cancel' : 'Keep visible'}
        </Button>
        <Button size="large" fullWidth onClick={p.onConfirm}>
          {p.show ? 'Show it' : 'Hide it'}
        </Button>
      </div>
    </ModalShell>
  );
}
