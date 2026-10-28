'use client';

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { coverKey } from '@/lib/utils/cover';
import { clampFocus, personCover, personInitials } from '@/lib/utils/person';
import type {
  ChatPerson,
  ChatRow,
  Chats,
  LastMessage,
  Message,
  MessageFile,
  NextBooking,
  Thread,
} from '@/types/messages';
import type { Remote } from '@/types/mentor';
import { remote } from './bookings';
import { ApiError, apiError, retryOnce } from './errors';
import { keys } from './keys';
import {
  untyped,
  type WireChatPerson,
  type WireChatRow,
  type WireChats,
  type WireLast,
  type WireMessage,
  type WireMessageFile,
  type WireMessageSettings,
  type WireNextBooking,
  type WireThread,
} from './pending';
import { sessionKey, useSession } from './session';

/** How often an open chat asks for new messages (PRD: 5 s). */
export const THREAD_POLL_MS = 5_000;
/** How often the list and the nav badge refresh (PRD: 30 s). */
export const LIST_POLL_MS = 30_000;

const DELETED_NAME = 'Deleted user';

// ---- Mappers ----------------------------------------------------------------

export function toChatPerson(p: WireChatPerson): ChatPerson {
  const first = (!p.deleted && p.first_name?.trim()) || '';
  const last = (!p.deleted && p.last_name?.trim()) || '';
  const name = [first, last].filter(Boolean).join(' ');
  return {
    id: p.id,
    // A closed account keeps its chat but loses its name, as booking parties do.
    name: p.deleted || !name ? DELETED_NAME : name,
    firstName: p.deleted ? DELETED_NAME : first || name || DELETED_NAME,
    initials: p.deleted ? '' : personInitials(first, last),
    avatarUrl: p.deleted ? null : (p.avatar_url ?? null),
    avatarFocus: p.deleted ? null : clampFocus(p.avatar_focus),
    cover: personCover(p.id, coverKey(p.deleted ? null : p.cover_color)),
    role: p.role,
    institution: p.deleted ? null : p.institution?.trim() || null,
    handle: p.deleted ? null : (p.handle ?? null),
    state: p.deleted ? 'closed' : p.paused ? 'paused' : 'active',
  };
}

function toNextBooking(b: WireNextBooking | null): NextBooking | null {
  return b
    ? { id: b.id, startsAt: b.starts_at, sessionName: b.session_name?.trim() || null }
    : null;
}

function toLast(l: WireLast | null): LastMessage | null {
  if (!l) return null;
  return {
    kind: l.kind,
    text: l.deleted ? null : l.text,
    fileName: l.deleted ? null : l.file_name,
    mine: l.mine,
    at: l.at,
    deleted: l.deleted,
  };
}

export function toChatRow(r: WireChatRow): ChatRow {
  return {
    person: toChatPerson(r.person),
    last: toLast(r.last),
    unread: Math.max(0, r.unread),
    nextBooking: toNextBooking(r.next_booking),
  };
}

export function toChats(w: WireChats): Chats {
  return { rows: w.data.map(toChatRow), totalUnread: Math.max(0, w.total_unread) };
}

export function toMessageFile(f: WireMessageFile): MessageFile {
  return { id: f.id, name: f.filename, sizeBytes: f.size, contentType: f.content_type };
}

export function toMessage(m: WireMessage): Message {
  return {
    id: m.id,
    clientId: m.client_id,
    mine: m.mine,
    body: m.deleted ? null : m.body,
    file: m.deleted || !m.file ? null : toMessageFile(m.file),
    sentAt: m.sent_at,
    editedAt: m.edited_at,
    deleted: m.deleted,
  };
}

export function toThread(w: WireThread): Thread {
  return {
    person: toChatPerson(w.person),
    lock: w.lock,
    nextBooking: toNextBooking(w.next_booking),
    sessionWindow: w.session_window,
    items: w.items.map(toMessage),
    theirLastReadAt: w.their_last_read_at,
    myLastReadAt: w.my_last_read_at,
    hasMore: w.has_more,
    cursor: w.items.at(-1)?.id ?? null,
  };
}

/**
 * New messages after the cache's last one, appended without repeats. The
 * header fields (lock, next booking, read state) always come from the newer read.
 */
export function mergeNewer(prev: Thread, next: Thread): Thread {
  const seen = new Set(prev.items.map((m) => m.id));
  return {
    ...next,
    items: [...prev.items, ...next.items.filter((m) => !seen.has(m.id))],
    hasMore: prev.hasMore,
    cursor: next.cursor ?? prev.cursor,
  };
}

/** Older messages before the cache's first one, prepended. `hasMore` is the older read's. */
export function mergeOlder(prev: Thread, older: Thread): Thread {
  const seen = new Set(prev.items.map((m) => m.id));
  return {
    ...prev,
    items: [...older.items.filter((m) => !seen.has(m.id)), ...prev.items],
    hasMore: older.hasMore,
    cursor: prev.cursor ?? older.cursor,
  };
}

// ---- Reads ------------------------------------------------------------------

/**
 * The session identity for query keys, or null while the session is unknown
 * (nothing is asked before the token can attach). Callers gate on being a member.
 */
function useMe(): { me: string | null } {
  const session = useSession();
  return { me: session.status === 'unknown' ? null : sessionKey(session) };
}

/** GET /me/messages: every connected person, refreshed every 30 s while shown. */
export function useChats(active = true): Remote<Chats> {
  const { me } = useMe();
  const enabled = active && !!me;
  const query = useQuery({
    queryKey: keys.messages.chats(me ?? 'none'),
    enabled,
    queryFn: async ({ signal }) => {
      const { data, error, response } = await untyped.GET('/api/v1/me/messages', { signal });
      if (!response.ok || !data) throw apiError(response.status, error, response);
      return toChats(data as WireChats);
    },
    refetchInterval: LIST_POLL_MS,
    retry: retryOnce,
  });
  return remote(query, () => void query.refetch(), enabled);
}

/**
 * GET /me/messages/unread: the nav badge, every 30 s app-wide. `active` is the
 * caller's say (a member, with Messages on); a failure shows no badge rather
 * than an error, because the badge is a hint.
 */
export function useUnreadTotal(active: boolean): number | null {
  const { me } = useMe();
  const query = useQuery({
    queryKey: keys.messages.unread(me ?? 'none'),
    enabled: active && !!me,
    queryFn: async ({ signal }) => {
      const { data, response } = await untyped.GET('/api/v1/me/messages/unread', { signal });
      if (!response.ok || !data) throw new ApiError(response.status);
      return Math.max(0, (data as { total: number }).total);
    },
    refetchInterval: LIST_POLL_MS,
    retry: retryOnce,
  });
  return query.data ?? null;
}

/** GET /me/messages/people?q=: connected people for New message. */
export function useMessagePeople(q: string, active: boolean): Remote<ChatPerson[]> {
  const { me } = useMe();
  const enabled = active && !!me;
  const query = useQuery({
    queryKey: keys.messages.people(me ?? 'none', q),
    enabled,
    queryFn: async ({ signal }) => {
      const { data, error, response } = await untyped.GET('/api/v1/me/messages/people', {
        params: { query: q ? { q } : {} },
        signal,
      });
      if (!response.ok || !data) throw apiError(response.status, error, response);
      return (data as { data: WireChatPerson[] }).data.map(toChatPerson);
    },
    placeholderData: (prev) => prev,
    retry: retryOnce,
  });
  return remote(query, () => void query.refetch(), enabled);
}

async function readThread(
  withId: string,
  query: { before?: string; after?: string; limit?: number },
  signal?: AbortSignal,
): Promise<Thread> {
  const { data, error, response } = await untyped.GET('/api/v1/me/messages/{user_id}', {
    params: { path: { user_id: withId }, query },
    signal,
  });
  if (!response.ok || !data) throw apiError(response.status, error, response);
  return toThread(data as WireThread);
}

export type ThreadRemote = Remote<Thread> & {
  /** Reads the page before the oldest message on screen. */
  loadOlder: () => Promise<void>;
};

/**
 * GET /me/messages/{user_id}: the open chat. The first read takes the newest
 * 50; every 5 s after that asks only for what's after the last one and appends
 * it (TanStack pauses the interval while the tab is hidden and reads once on
 * focus). A `404` is "not connected": the page shows the chat as gone.
 */
export function useThread(withId: string | null): ThreadRemote {
  const { me } = useMe();
  const qc = useQueryClient();
  const enabled = !!me && !!withId;
  const key = keys.messages.thread(me ?? 'none', withId ?? '');
  const query = useQuery({
    queryKey: key,
    enabled,
    queryFn: async ({ signal }) => {
      const prev = qc.getQueryData<Thread>(key);
      if (!prev || !prev.cursor) return readThread(withId!, {}, signal);
      const newer = await readThread(withId!, { after: prev.cursor }, signal);
      // Merged into the cache as it is now, not as it was before the request:
      // older pages loaded (or my sends settled) meanwhile must survive.
      return mergeNewer(qc.getQueryData<Thread>(key) ?? prev, newer);
    },
    refetchInterval: THREAD_POLL_MS,
    refetchOnWindowFocus: 'always',
    retry: retryOnce,
  });
  const loadOlder = useCallback(async () => {
    const prev = qc.getQueryData<Thread>(key);
    const firstId = prev?.items[0]?.id;
    if (!prev || !firstId || !prev.hasMore || !withId) return;
    const older = await readThread(withId, { before: firstId });
    qc.setQueryData<Thread>(key, (cur) => (cur ? mergeOlder(cur, older) : cur));
    // The key's parts are its identity; spreading them keeps this stable per chat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc, withId, me]);
  return { ...remote(query, () => void query.refetch(), enabled), loadOlder };
}

/**
 * GET /me/messages/{user_id}?limit=0: the lock and session window alone, for
 * SendMessage. No items, so it costs one small read when the pop-up opens.
 */
export function useChatStatus(withId: string | null): Remote<Thread> {
  const { me } = useMe();
  const enabled = !!me && !!withId;
  const query = useQuery({
    queryKey: [...keys.messages.thread(me ?? 'none', withId ?? ''), 'status'],
    enabled,
    queryFn: ({ signal }) => readThread(withId!, { limit: 0 }, signal),
    retry: retryOnce,
  });
  return remote(query, () => void query.refetch(), enabled);
}

// ---- Writes -----------------------------------------------------------------

/**
 * POST /me/messages/{user_id}/read: moves my read mark forward to `upTo` (the
 * newest message of theirs on screen). The badge and the list re-read at once,
 * so the count drops as the chat is read (PRD: "and right after reading a chat").
 */
export function useMarkRead() {
  const { me } = useMe();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ withId, upTo }: { withId: string; upTo: string }) => {
      const { error, response } = await untyped.POST('/api/v1/me/messages/{user_id}/read', {
        params: { path: { user_id: withId } },
        body: { up_to: upTo },
      });
      if (!response.ok) throw apiError(response.status, error, response);
    },
    onSuccess: (_d, { withId, upTo }) => {
      if (!me) return;
      // The chat's own read mark moves too, so reopening it shows nothing as new.
      qc.setQueryData<Thread>(keys.messages.thread(me, withId), (cur) => {
        const at = cur?.items.find((m) => m.id === upTo)?.sentAt;
        if (!cur || !at) return cur;
        const moved = !cur.myLastReadAt || Date.parse(at) > Date.parse(cur.myLastReadAt);
        return moved ? { ...cur, myLastReadAt: at } : cur;
      });
      void qc.invalidateQueries({ queryKey: keys.messages.unread(me) });
      void qc.invalidateQueries({ queryKey: keys.messages.chats(me) });
    },
  });
}

// ---- Message emails settings (PR 3) -------------------------------------------

export type MessageSettings = { unreadEmails: boolean };

/** GET /me/messages/settings: the unread-email switch (default on). */
export function useMessageSettings(active: boolean): Remote<MessageSettings> {
  const { me } = useMe();
  const enabled = active && !!me;
  const query = useQuery({
    queryKey: keys.messages.settings(me ?? 'none'),
    enabled,
    queryFn: async ({ signal }) => {
      const { data, error, response } = await untyped.GET('/api/v1/me/messages/settings', {
        signal,
      });
      if (!response.ok || !data) throw apiError(response.status, error, response);
      return { unreadEmails: (data as WireMessageSettings).unread_emails };
    },
    retry: retryOnce,
  });
  return remote(query, () => void query.refetch(), enabled);
}

/** PATCH /me/messages/settings: saves on flip, optimistic, rolled back on failure. */
export function useSaveMessageSettings() {
  const { me } = useMe();
  const qc = useQueryClient();
  const key = keys.messages.settings(me ?? 'none');
  return useMutation({
    mutationFn: async (next: MessageSettings) => {
      const { data, error, response } = await untyped.PATCH('/api/v1/me/messages/settings', {
        body: { unread_emails: next.unreadEmails },
      });
      if (!response.ok || !data) throw apiError(response.status, error, response);
      return { unreadEmails: (data as WireMessageSettings).unread_emails };
    },
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<MessageSettings>(key);
      qc.setQueryData(key, next);
      return { prev };
    },
    onError: (_e, _next, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSuccess: (saved) => qc.setQueryData(key, saved),
  });
}
