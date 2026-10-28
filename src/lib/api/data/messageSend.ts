'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { Message, MessageFile, OutboxItem, Thread } from '@/types/messages';
import { apiError, ApiError } from './errors';
import { keys } from './keys';
import { toMessage } from './messages';
import { untyped, type WireMessage } from './pending';
import { sessionKey, useSession } from './session';

/**
 * The outbox: messages this tab has written and the server hasn't stored yet.
 *
 * A message shows at once as mine (PRD "Sending"), then becomes Sent, Waiting to
 * send (offline: sent on reconnect, in order) or Not sent (Try again). Every
 * item keeps its `client_id` across retries, and the server stores a repeated
 * `client_id` once, so a retry after a lost response can never send twice.
 *
 * Module state on purpose: a send outlives the chat it was written in (switching
 * chats mid-send must not drop it), and Logout replaces the page, which clears it.
 */
let items: OutboxItem[] = [];
const listeners = new Set<() => void>();
/** One chain per recipient, so two quick sends reach the server in the order written. */
const chains = new Map<string, Promise<unknown>>();
let ctx: { qc: QueryClient; me: string } | null = null;
let listening = false;

function emit() {
  for (const l of listeners) l();
}

function update(clientId: string, patch: Partial<OutboxItem> | null) {
  items = patch
    ? items.map((i) => (i.clientId === clientId ? { ...i, ...patch } : i))
    : items.filter((i) => i.clientId !== clientId);
  emit();
}

function offline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/** The thread cache gains the stored message (once), and the list re-reads its preview. */
function settle(withId: string, msg: Message) {
  if (!ctx) return;
  const { qc, me } = ctx;
  qc.setQueryData<Thread>(keys.messages.thread(me, withId), (cur) =>
    !cur || cur.items.some((m) => m.id === msg.id) ? cur : { ...cur, items: [...cur.items, msg] },
  );
  void qc.invalidateQueries({ queryKey: keys.messages.chats(me) });
}

/** The server refused for a reason the chat itself shows (paused, closed): re-read it. */
function refreshThread(withId: string) {
  if (!ctx) return;
  void ctx.qc.invalidateQueries({ queryKey: keys.messages.thread(ctx.me, withId) });
}

async function post(item: OutboxItem): Promise<boolean> {
  try {
    const { data, error, response } = await untyped.POST('/api/v1/me/messages/{user_id}', {
      params: { path: { user_id: item.to } },
      body: {
        client_id: item.clientId,
        ...(item.body ? { body: item.body } : {}),
        ...(item.file ? { file_id: item.file.id } : {}),
      },
    });
    if (!response.ok || !data) throw apiError(response.status, error, response);
    update(item.clientId, null);
    settle(item.to, toMessage(data as WireMessage));
    return true;
  } catch (e) {
    // No response at all while offline: wait for the connection, don't fail.
    if (!(e instanceof ApiError) && offline()) {
      update(item.clientId, { status: 'waiting' });
      return false;
    }
    if (e instanceof ApiError && e.status === 409) refreshThread(item.to);
    update(item.clientId, { status: 'failed' });
    return false;
  }
}

/** Queue behind this recipient's earlier sends, then post. */
function enqueue(item: OutboxItem): Promise<boolean> {
  const prev = chains.get(item.to) ?? Promise.resolve();
  const next = prev.then(() => post(item));
  chains.set(
    item.to,
    next.catch(() => undefined),
  );
  return next;
}

/** Back online: every waiting message goes, oldest first, in its own chat's order. */
function flush() {
  const waiting = items
    .filter((i) => i.status === 'waiting')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const w of waiting) {
    update(w.clientId, { status: 'sending' });
    void enqueue({ ...w, status: 'sending' });
  }
}

function listen() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('online', flush);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const EMPTY: OutboxItem[] = [];

/** The unsent messages to one person, oldest first. */
export function useOutbox(to: string | null): OutboxItem[] {
  return useSyncExternalStore(
    subscribe,
    () => (to ? items : EMPTY),
    () => EMPTY,
  ).filter((i) => i.to === to);
}

export type SendInput = {
  to: string;
  body: string;
  file: MessageFile | null;
  /**
   * The caller's own id for this message, so it can `retry(clientId)` the same
   * one after a failure rather than send a second (SendMessage). Made here
   * when left out.
   */
  clientId?: string;
};

/**
 * POST /me/messages/{user_id} through the outbox. `send` resolves true once
 * stored; `retry` re-posts a failed message with the same `client_id`.
 */
export function useSendMessage() {
  const qc = useQueryClient();
  const session = useSession();
  const known = session.status !== 'unknown';
  const me = sessionKey(session);
  // The cache the outbox settles into, and the reconnect listener, set once known.
  useEffect(() => {
    if (!known) return;
    ctx = { qc, me };
    listen();
  }, [known, qc, me]);

  const send = useCallback(({ to, body, file, clientId }: SendInput): Promise<boolean> => {
    const text = body.trim();
    if (!text && !file) return Promise.resolve(false);
    const item: OutboxItem = {
      clientId: clientId ?? crypto.randomUUID(),
      to,
      body: text || null,
      file,
      createdAt: new Date().toISOString(),
      status: offline() ? 'waiting' : 'sending',
    };
    items = [...items, item];
    emit();
    if (item.status === 'waiting') return Promise.resolve(false);
    return enqueue(item);
  }, []);

  const retry = useCallback((clientId: string): Promise<boolean> => {
    const item = items.find((i) => i.clientId === clientId);
    if (!item) return Promise.resolve(false);
    const status = offline() ? 'waiting' : 'sending';
    update(clientId, { status });
    if (status === 'waiting') return Promise.resolve(false);
    return enqueue({ ...item, status });
  }, []);

  return { send, retry };
}

/** For tests: an empty outbox. */
export function resetOutbox() {
  items = [];
  chains.clear();
  emit();
}
