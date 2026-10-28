'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { useMarkRead, useThread } from '@/lib/api/data/messages';
import { useOutbox, useSendMessage } from '@/lib/api/data/messageSend';
import { CHAT_COPY, EMPTY_CHAT_COPY, LOCK_COPY, STARTERS_COPY } from '@/lib/copy/messages';
import { formatNextAvailable } from '@/lib/utils/format';
import { useOnline } from '@/lib/utils/useOnline';
import type { ChatPerson, NextBooking } from '@/types/messages';
import { GoneState } from './ChatPane';
import { Composer } from './Composer';
import { MessageBubble, OutboxBubble } from './MessageBubble';
import { type Starter } from './starters';
import { newDivider, newestTheirs, threadItems, type NewDivider } from './threadItems';
import { usePageVisible } from './usePageVisible';
import composerStyles from './Composer.module.css';
import styles from './Thread.module.css';

/**
 * The open chat's body: the thread and the composer (or the read-only line).
 * Polls through `useThread` (5 s, paused while hidden); marks their messages
 * read only while the chat is on screen and the page visible.
 */
export function ChatView({
  person,
  nextBooking,
  viewerIsMentee,
  timeZone,
  phone,
  /** False while the chat is hidden (a phone showing the list): nothing is marked read. */
  shown,
  draft,
  onDraft,
  starters,
  onRetried,
}: {
  person: ChatPerson;
  nextBooking: NextBooking | null;
  viewerIsMentee: boolean;
  timeZone: string;
  phone: boolean;
  shown: boolean;
  draft: string;
  onDraft: (v: string) => void;
  starters: Starter[];
  /** "Message sent." after a Try again goes through. */
  onRetried: () => void;
}) {
  const thread = useThread(person.id);
  const outbox = useOutbox(person.id);
  const { send, retry } = useSendMessage();
  const markRead = useMarkRead();
  const online = useOnline();
  const visible = usePageVisible();
  const scrollRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const t = thread.data;
  const messages = useMemo(() => t?.items ?? [], [t]);

  // The "{N} new" divider stays where it was when the chat opened.
  const [divider, setDivider] = useState<NewDivider | null | undefined>(undefined);
  if (t && divider === undefined) setDivider(newDivider(t.items, t.myLastReadAt));

  // Read: the newest message of theirs, while the chat is shown and the page
  // visible, and only when it's past my read mark (nothing to move otherwise).
  const latest = newestTheirs(messages);
  const myMark = t?.myLastReadAt ?? null;
  const newest =
    latest && (!myMark || Date.parse(latest.sentAt) > Date.parse(myMark)) ? latest.id : null;
  const sentFor = useRef<string | null>(null);
  const { mutate } = markRead;
  useEffect(() => {
    if (!shown || !visible || !newest || sentFor.current === newest) return;
    sentFor.current = newest;
    // A failed read is tried again with the next poll's answer (`t` changes), not in a loop.
    mutate(
      { withId: person.id, upTo: newest },
      {
        onError: () => {
          sentFor.current = null;
        },
      },
    );
  }, [shown, visible, newest, person.id, mutate, t]);

  // Newest at the bottom: on open, on my send, and when new ones arrive while at
  // the bottom. An older page keeps the reader where they were.
  const atBottom = useRef(true);
  const olderFrom = useRef<number | null>(null);
  const count = messages.length + outbox.length;
  const loaded = !!t;
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (olderFrom.current !== null) {
      el.scrollTop += el.scrollHeight - olderFrom.current;
      olderFrom.current = null;
    } else if (atBottom.current) el.scrollTop = el.scrollHeight;
  }, [count, loaded]);
  // The box growing (or the window) shrinks the thread: stay on the newest.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      if (atBottom.current) el.scrollTop = el.scrollHeight;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [loaded]);

  const items = useMemo(
    () =>
      threadItems(messages, outbox, {
        timeZone,
        divider: divider ?? null,
        theirLastReadAt: t?.theirLastReadAt ?? null,
      }),
    [messages, outbox, timeZone, divider, t?.theirLastReadAt],
  );

  const first = person.firstName;
  const lock = t?.lock ?? null;
  const empty = !!t && messages.length === 0 && outbox.length === 0;

  // The draft clears on the next render: a second Enter (or tap) before then
  // must not send the same words again as a new message.
  const sentDraft = useRef<string | null>(null);
  useEffect(() => {
    if (draft === '') sentDraft.current = null;
  }, [draft]);
  const doSend = () => {
    const text = draft.trim();
    if (!text || sentDraft.current === draft) return;
    sentDraft.current = draft;
    atBottom.current = true;
    onDraft('');
    void send({ to: person.id, body: text, file: null });
  };

  if (thread.error && !t) {
    // Not connected (404) is the same state as a `?with=` that isn't a chat.
    if (thread.error.status === 404) return <GoneState />;
    return (
      <div className={styles.state}>
        <EmptyState
          illustration="chat"
          size={120}
          title={CHAT_COPY.loadError}
          actions={
            <Button size="large" onClick={thread.retry}>
              {CHAT_COPY.tryAgain}
            </Button>
          }
        />
      </div>
    );
  }
  // One alert for the newest failure: reopening a chat doesn't read every one out.
  const lastFailed = outbox.filter((o) => o.status === 'failed').at(-1)?.clientId;

  return (
    <>
      <div
        ref={scrollRef}
        role="log"
        aria-label={CHAT_COPY.chatLabel(person.name)}
        // Focusable, so the thread scrolls from the keyboard too.
        tabIndex={0}
        className={styles.scroll}
        aria-busy={!t || undefined}
        onScroll={(e) => {
          const el = e.currentTarget;
          atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
        }}
      >
        <p className={styles.privacy}>
          <Icon name="lock" size={16} className={styles.privacyIcon} />
          <span>{CHAT_COPY.privacy(first)}</span>
        </p>
        {!t && <ThreadSkeleton />}
        {t?.hasMore && (
          <Button
            variant="text"
            size="small"
            className={styles.earlier}
            onClick={() => {
              atBottom.current = false;
              olderFrom.current = scrollRef.current?.scrollHeight ?? null;
              void thread.loadOlder();
            }}
          >
            {CHAT_COPY.earlier}
          </Button>
        )}
        {empty && (
          <div className={styles.empty}>
            <Avatar
              size="xl"
              initials={person.initials}
              tone={person.cover}
              src={person.avatarUrl}
              focus={person.avatarFocus}
              alt=""
            />
            <div className={styles.emptyCopy}>
              <h2 className={styles.emptyTitle}>{EMPTY_CHAT_COPY.title(first)}</h2>
              <p className={styles.emptySub}>
                {nextBooking
                  ? viewerIsMentee
                    ? EMPTY_CHAT_COPY.menteeUpcoming(
                        first,
                        formatNextAvailable(nextBooking.startsAt, timeZone),
                      )
                    : EMPTY_CHAT_COPY.mentorUpcoming(
                        formatNextAvailable(nextBooking.startsAt, timeZone),
                      )
                  : EMPTY_CHAT_COPY.noneUpcoming}
              </p>
            </div>
          </div>
        )}
        {items.map((it) =>
          it.kind === 'day' ? (
            <div key={it.key} className={styles.day}>
              {it.label}
            </div>
          ) : it.kind === 'new' ? (
            <div
              key={it.key}
              role="separator"
              aria-label={CHAT_COPY.newCount(it.count)}
              className={styles.newLine}
            >
              {CHAT_COPY.newCount(it.count)}
            </div>
          ) : it.kind === 'message' ? (
            <MessageBubble key={it.key} message={it.message} read={it.read} timeZone={timeZone} />
          ) : (
            <OutboxBubble
              key={it.key}
              item={it.item}
              announce={it.item.clientId === lastFailed}
              timeZone={timeZone}
              onRetry={() =>
                void retry(it.item.clientId).then((ok) => {
                  if (ok) onRetried();
                })
              }
            />
          ),
        )}
      </div>
      {lock ? (
        <div className={composerStyles.composer}>
          <div role="status" className={composerStyles.lock}>
            <Icon
              name={lock === 'paused' ? 'pause_circle' : 'person_off'}
              size={20}
              className={composerStyles.lockIcon}
            />
            <span className={composerStyles.lockText}>
              {lock === 'paused' ? LOCK_COPY.paused(first) : LOCK_COPY.closed(first)}
            </span>
          </div>
        </div>
      ) : (
        t && (
          <Composer
            ref={boxRef}
            first={first}
            value={draft}
            onChange={onDraft}
            onSend={doSend}
            phone={phone}
            offline={!online}
            starters={
              empty && starters.length > 0 ? (
                <div className={composerStyles.starters}>
                  <span className={composerStyles.startersLead}>{STARTERS_COPY.lead}</span>
                  <div className={composerStyles.chips}>
                    {starters.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        className={composerStyles.chip}
                        onClick={() => {
                          onDraft(s.text);
                          boxRef.current?.focus();
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null
            }
          />
        )
      )}
    </>
  );
}

function ThreadSkeleton() {
  return (
    <div aria-hidden className={styles.skeleton}>
      <Skeleton width="55%" height="56px" radius="lg" />
      <Skeleton width="40%" height="44px" radius="lg" />
    </div>
  );
}
