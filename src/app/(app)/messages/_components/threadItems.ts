import { dayKey, separatorLabel } from '@/lib/utils/messageTime';
import type { Message, OutboxItem } from '@/types/messages';

/** One line of the thread, in order (Messages.dc.html `items`). */
export type ThreadItem =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'new'; key: string; count: number }
  | { kind: 'message'; key: string; message: Message; read: boolean }
  | { kind: 'outbox'; key: string; item: OutboxItem };

/** Where "{N} new" goes: above this message, counting these. */
export type NewDivider = { id: string; count: number };

/**
 * The divider as the chat opens (Messages.dc.html `newLine`): above the first
 * message of theirs after my read mark, counting those. Worked out once, at
 * open, so it neither moves nor grows as messages are read or arrive.
 */
export function newDivider(messages: Message[], myLastReadAt: string | null): NewDivider | null {
  const mark = myLastReadAt ? Date.parse(myLastReadAt) : null;
  const unseen = messages.filter(
    (m) => !m.mine && !m.deleted && (mark === null || Date.parse(m.sentAt) > mark),
  );
  return unseen[0] ? { id: unseen[0].id, count: unseen.length } : null;
}

/**
 * The thread as drawn: a day separator before each new day, the "{N} new"
 * divider where it was at open, then this device's unsent messages last, in
 * the order written. A message the server has stored drops its outbox twin
 * (same `client_id`).
 */
export function threadItems(
  messages: Message[],
  outbox: OutboxItem[],
  opts: {
    timeZone: string;
    divider: NewDivider | null;
    theirLastReadAt: string | null;
    now?: Date;
  },
): ThreadItem[] {
  const out: ThreadItem[] = [];
  let lastDay: string | null = null;
  const day = (at: string) => {
    const k = dayKey(at, opts.timeZone);
    if (k === lastDay) return;
    lastDay = k;
    out.push({ kind: 'day', key: `day-${k}`, label: separatorLabel(at, opts.timeZone, opts.now) });
  };
  const theirMark = opts.theirLastReadAt ? Date.parse(opts.theirLastReadAt) : null;
  for (const m of messages) {
    day(m.sentAt);
    if (m.id === opts.divider?.id) out.push({ kind: 'new', key: 'new', count: opts.divider.count });
    const read = m.mine && theirMark !== null && Date.parse(m.sentAt) <= theirMark;
    out.push({ kind: 'message', key: m.id, message: m, read });
  }
  const stored = new Set(messages.map((m) => m.clientId).filter(Boolean));
  for (const o of outbox) {
    if (stored.has(o.clientId)) continue;
    day(o.createdAt);
    out.push({ kind: 'outbox', key: o.clientId, item: o });
  }
  return out;
}

/** The newest message of theirs: what `/read` is told I've read up to. */
export function newestTheirs(messages: Message[]): Message | null {
  for (let i = messages.length - 1; i >= 0; i--) if (!messages[i]!.mine) return messages[i]!;
  return null;
}
