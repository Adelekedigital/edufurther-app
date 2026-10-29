'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { Snackbar } from '@/components/molecules/Snackbar/Snackbar';
import { useChats } from '@/lib/api/data/messages';
import { EMPTY_INBOX_COPY, LIST_COPY } from '@/lib/copy/messages';
import { cx } from '@/lib/utils/cx';
import { deviceTimeZone } from '@/lib/utils/format';
import { useHydrated } from '@/lib/utils/useHydrated';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import { lockedPageGate, memberGate, MESSAGES_GATE } from '@/app/_shell/MentorGate';
import { useAppShell } from '@/app/_shell/useAppShell';
import { ChatList, ChatListSkeleton } from './ChatList';
import { ChatGone, ChatPane, ChatPaneSkeleton } from './ChatPane';
import { noRowsKind, rowView, visibleRows, type ChatFilter } from './chatRows';
import { MessageEmailsDialog } from './MessageEmailsDialog';
import { NewMessageDialog } from './NewMessageDialog';
import { useMessagesUrl } from './useMessagesUrl';
import styles from './MessagesScreen.module.css';

/**
 * `/messages` (Messages.dc.html, `layout` split): the list and the open chat
 * side by side on desktop; on phones the list, then the chat full screen.
 * Desktop always has a chat open: `?with=`, else the top row ("Pick a chat" is
 * never shown). Phones open a chat only from `?with=`.
 */
export function MessagesScreen() {
  const { viewer, member, access } = useAppShell();
  const url = useMessagesUrl();
  const isPhone = useMediaQuery('(max-width: 767px)');
  const locked = access.locked.has('Messages');
  const chats = useChats(!!member && !locked);
  const timeZone = useMemo(() => member?.timeZone ?? deviceTimeZone(), [member?.timeZone]);
  const mentee = !!member && !member.isMentor;

  const [q, setQ] = useState('');
  const [filter, setFilterState] = useState<ChatFilter>('all');
  // The chat opened from the Unread filter stays listed until the filter changes.
  const [keepId, setKeepId] = useState<string | null>(null);
  const setFilter = (f: ChatFilter) => {
    setFilterState(f);
    // Desktop with no `?with=` opens the list's top chat, so Unread keeps that one
    // too: read, it must not drop out and hand the pane to the next unread chat.
    const top =
      f === 'unread' && !isPhone && !url.withId
        ? visibleRows(chats.data?.rows ?? [], q, 'unread', null)[0]
        : undefined;
    setKeepId(top?.person.id ?? null);
  };
  const [dialog, setDialog] = useState<'new' | 'settings' | null>(null);
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);

  // `?settings=1` (the emails' "Turn off these emails") opens it too; closing drops the param.
  // After hydration: the dialog renders into <body>, which the server render has none of.
  const hydrated = useHydrated();
  const showSettings = dialog === 'settings' || (hydrated && url.settings);
  const closeSettings = () => {
    setDialog(null);
    if (url.settings) url.dropSettings();
  };

  // A chat opened on a phone from the list is a step forward; Back steps back.
  const pushed = useRef(false);
  const open = (id: string) => {
    if (filter === 'unread') setKeepId(id);
    pushed.current = isPhone;
    url.openChat(id, isPhone);
  };
  const back = () => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else url.closeChat();
  };

  const rows = chats.data?.rows ?? [];
  const now = new Date();
  const visible = visibleRows(rows, q, filter, keepId);
  const shown = visible.map((r) => rowView(r, timeZone, now));
  // Desktop with no `?with=`: the top row of the list as shown (the filter and
  // search included), so the open chat is always one the list can point at. It
  // stays open while it's listed: a poll reordering the list must not swap the
  // chat (and lose the focus inside it) under the reader.
  const [defaultId, setDefaultId] = useState<string | null>(null);
  const defaultRow = visible.find((r) => r.person.id === defaultId) ?? visible[0] ?? null;
  if (!url.withId && !isPhone && defaultRow && defaultRow.person.id !== defaultId)
    setDefaultId(defaultRow.person.id);
  const openRow = url.withId
    ? (rows.find((r) => r.person.id === url.withId) ?? null)
    : isPhone
      ? null
      : defaultRow;

  // Picked from New message but not in the list yet (connected since the last
  // poll): read the list again, and wait for it before calling the chat gone.
  const [awaiting, setAwaiting] = useState<string | null>(null);
  const pick = (id: string) => {
    if (!rows.some((r) => r.person.id === id)) {
      setAwaiting(id);
      chats.retry();
    }
    open(id);
  };
  const waitingFor = !openRow && url.withId === awaiting && chats.refreshing;

  const gate = memberGate(viewer, '/messages', MESSAGES_GATE) ?? lockedPageGate(access, 'Messages');
  if (gate) return gate;

  const dialogs = (
    <>
      {dialog === 'new' && (
        <NewMessageDialog
          mentee={mentee}
          onClose={() => setDialog(null)}
          onPick={(id) => {
            setDialog(null);
            pick(id);
          }}
        />
      )}
      {showSettings && (
        <MessageEmailsDialog
          onDone={(text) => {
            closeSettings();
            if (text) setToast({ text, id: Date.now() });
          }}
        />
      )}
      <Snackbar message={toast?.text ?? null} stamp={toast?.id} />
    </>
  );

  // No role UI until the role is known: the same neutral skeleton as loading.
  if (viewer.kind === 'loading' || (chats.isLoading && !chats.data && !chats.error)) {
    return <MessagesSkeleton>{dialogs}</MessagesSkeleton>;
  }

  // Error before empty: a list that never loaded isn't an empty inbox.
  if (chats.error && !chats.data) {
    return (
      <div className={cx(styles.pane, styles.centred)}>
        <h1 className="sr-only">{LIST_COPY.title}</h1>
        <EmptyState
          illustration="chat"
          size={120}
          title={LIST_COPY.loadError}
          description={LIST_COPY.loadErrorBody}
          actions={
            <Button size="large" onClick={chats.retry}>
              {LIST_COPY.tryAgain}
            </Button>
          }
        />
        {dialogs}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className={cx(styles.pane, styles.centred)}>
        <h1 className="sr-only">{LIST_COPY.title}</h1>
        <div className={styles.empty}>
          <EmptyState
            illustration="chat"
            title={EMPTY_INBOX_COPY.title}
            description={EMPTY_INBOX_COPY.body(mentee)}
            actions={
              mentee ? (
                <ButtonLink href="/explore" prefetch={false} size="medium">
                  {EMPTY_INBOX_COPY.findMentor}
                </ButtonLink>
              ) : undefined
            }
          />
        </div>
        {dialogs}
      </div>
    );
  }

  const chatOpen = !!url.withId;
  return (
    <div className={styles.pane} data-chat-open={chatOpen}>
      <ChatList
        className={styles.list}
        rows={shown}
        currentId={isPhone ? null : (openRow?.person.id ?? null)}
        q={q}
        onQ={setQ}
        filter={filter}
        onFilter={setFilter}
        totalUnread={chats.data?.totalUnread ?? 0}
        noRows={noRowsKind(shown.length, q, filter)}
        onSelect={open}
        onSettings={() => setDialog('settings')}
        onNew={() => setDialog('new')}
      />
      <div className={styles.chat}>
        {waitingFor ? (
          <ChatPaneSkeleton />
        ) : openRow ? (
          <ChatPane
            key={openRow.person.id}
            person={openRow.person}
            nextBooking={openRow.nextBooking}
            viewerIsMentee={mentee}
            timeZone={timeZone}
            onBack={back}
          />
        ) : (
          url.withId && <ChatGone onBack={back} />
        )}
      </div>
      {dialogs}
    </div>
  );
}

/** The page while it loads: the list's and the chat's skeletons, nothing role-specific. */
export function MessagesSkeleton({ children }: { children?: ReactNode }) {
  return (
    <div className={styles.pane} data-chat-open="false">
      <ChatListSkeleton />
      <div className={styles.chatSkeleton}>
        <ChatPaneSkeleton />
      </div>
      {children}
    </div>
  );
}
