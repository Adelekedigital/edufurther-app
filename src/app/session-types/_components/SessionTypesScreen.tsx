'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { SessionTypeManager } from '@/components/organisms/SessionTypeManager/SessionTypeManager';
import { AppShell } from '@/components/templates/AppShell/AppShell';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { useDeleteSessionType, useOwnSessionTypes, useSetLive } from '@/lib/api/data/sessionTypes';
import { SESSION_TEMPLATES, templateHint } from '@/lib/utils/sessionTemplates';
import { useOnline } from '@/lib/utils/useOnline';
import type { Remote } from '@/types/mentor';
import type { DeleteError, OwnSessionType } from '@/types/sessionType';
import { useAppShell } from '../../_shell/useAppShell';
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

  const [confirming, setConfirming] = useState<OwnSessionType | null>(null);
  const del = useDeleteSessionType();
  const closeConfirm = () => {
    setConfirming(null);
    del.reset();
  };

  let body: ReactNode;
  if (viewer.kind === 'guest') {
    body = (
      <Gate
        // PROVISIONAL copy — design request #3.
        title="Log in to manage your session types"
        description="Session types are what mentees can book with you."
        action={
          <ButtonLink href="/login?next=%2Fsession-types" prefetch={false} size="large">
            Log in
          </ButtonLink>
        }
      />
    );
  } else if (viewer.kind === 'error') {
    body = (
      <Gate
        title="We couldn’t load your account"
        description="Something went wrong on our side. Try again in a moment."
        action={
          <Button size="large" onClick={viewer.retry} busy={viewer.retrying}>
            Try again
          </Button>
        }
      />
    );
  } else if (viewer.kind !== 'loading' && !isMentor) {
    body = (
      <Gate
        // PROVISIONAL copy — design request #3.
        title="Session types are for mentors"
        description="Once you’re a mentor, this is where you set up what mentees can book with you."
        action={
          <ButtonLink href="/explore" size="large" variant="secondary-outlined">
            Find a mentor
          </ButtonLink>
        }
      />
    );
  } else {
    body = (
      <SessionTypeManager
        list={list}
        messages={messages}
        onLiveChange={onLiveChange}
        onDelete={setConfirming}
        createHref={CREATE_HREF}
        templates={TEMPLATES}
      />
    );
  }

  return (
    <AppShell active="Sessions" nav={nav} chrome={chrome} account={account} offline={!online}>
      {body}
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

function Gate(p: { title: string; description: string; action: ReactNode }) {
  return (
    <div className={styles.gate}>
      <EmptyState
        illustration="task-templates"
        size={120}
        title={p.title}
        description={p.description}
        actions={p.action}
        // The gate is the whole page, so its title is the page's h1.
        headingLevel={1}
      />
    </div>
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
      subtitle={`“${p.type.name}” will be removed from your profile.`}
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
