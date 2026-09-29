'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
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
  // Rows whose message is progress or success (not an error); a switch's
  // messages always clear this, so a failed save never looks like a note.
  const [infoIds, setInfoIds] = useState<string[]>([]);
  const onLiveFailed = useCallback((id: string, live: boolean) => {
    setInfoIds((ids) => ids.filter((x) => x !== id));
    setMessages((m) => ({
      ...m,
      // PROVISIONAL copy — design request #2.
      [id]: `Couldn’t ${live ? 'make it live' : 'hide it'}. Check your connection and try again.`,
    }));
  }, []);
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

  // Featured: one at a time; featuring another asks first (design `feature` confirm).
  const setFeatured = useSetFeatured((id, featured) =>
    say(
      id,
      // PROVISIONAL copy — design request #10.
      featured
        ? 'Couldn’t feature it. A hidden session type can’t be featured; show it first, or try again.'
        : 'Couldn’t remove it from featured. Check your connection and try again.',
      false,
    ),
  );
  const [featuring, setFeaturing] = useState<{
    type: OwnSessionType;
    current: OwnSessionType;
  } | null>(null);
  const onFeature = (t: OwnSessionType, featured: boolean) => {
    setMessages(({ [t.id]: _cleared, ...rest }) => rest);
    const current = (list.data ?? []).find((x) => x.isFeatured && x.id !== t.id);
    if (featured && current) return setFeaturing({ type: t, current });
    setFeatured(t.id, featured);
  };
  const restore = useRestoreSessionType((id) =>
    // PROVISIONAL copy — design request #10.
    say(id, 'Couldn’t keep it. Check your connection and try again.', false),
  );

  const body: ReactNode = mentorGate(viewer, isMentor, '/session-types') ?? (
    <SessionTypeManager
      list={list}
      messages={messages}
      infoIds={infoIds}
      onLiveChange={askVisibility}
      onDelete={setConfirming}
      onEdit={(t) => router.push(`/session-types/${encodeURIComponent(t.id)}/edit`)}
      onFeature={onFeature}
      onRestore={(t) => {
        setMessages(({ [t.id]: _cleared, ...rest }) => rest);
        restore.restore(t.id);
      }}
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
      {featuring && (
        <FeatureConfirm
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
          type={confirming}
          busy={del.isPending}
          error={del.error}
          onKeep={closeConfirm}
          onDelete={() =>
            void del
              .remove(confirming.id)
              .then(closeConfirm)
              .catch(() => undefined)
          }
        />
      )}
    </AppShell>
  );
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/**
 * Delete confirms in a danger modal (project rule). With sessions still booked
 * it's the design's "Schedule deletion for {date}?": hidden now, deleted after
 * the last one (backend round 4).
 */
function DeleteConfirm(p: {
  type: OwnSessionType;
  busy: boolean;
  error: DeleteError | null;
  onKeep: () => void;
  onDelete: () => void;
}) {
  const { count, lastEndsAt } = p.type.booked;
  const scheduled = count > 0;
  const title = !scheduled
    ? 'Delete this session type?'
    : lastEndsAt
      ? `Schedule deletion for ${shortDate(lastEndsAt)}?`
      : 'Schedule deletion?';
  const subtitle = scheduled
    ? `Hidden from mentees now. The ${count} booked session${count === 1 ? ' goes' : 's go'} ahead first.`
    : `“${p.type.name}” is removed from your profile and Session types. This can’t be undone.`;
  return (
    <ModalShell
      title={title}
      subtitle={subtitle}
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
          {scheduled ? 'Schedule deletion' : 'Delete'}
        </Button>
      </div>
    </ModalShell>
  );
}

/**
 * Featuring another type (Session Types.dc.html `feature` confirm). The
 * design's "…and is highlighted first on your Explore card" waits for Explore
 * to show it (backend #299): never claim what isn't built.
 */
function FeatureConfirm(p: {
  type: OwnSessionType;
  current: OwnSessionType;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell
      title={`Feature “${p.type.name}” instead?`}
      subtitle={`It moves to the top of your profile. “${p.current.name}” will no longer be featured. You can feature one session type at a time.`}
      icon="star"
      size="sm"
      onClose={p.onCancel}
    >
      <div className={styles.buttons}>
        <Button size="large" variant="secondary-outlined" fullWidth onClick={p.onCancel}>
          Cancel
        </Button>
        <Button size="large" fullWidth onClick={p.onConfirm}>
          Feature this instead
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
