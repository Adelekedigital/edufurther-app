import { dayKey, separatorLabel } from '@/lib/utils/messageTime';
import type { Message, OutboxItem } from '@/types/messages';

/** One line of the thread, in order (Messages.dc.html `items`). */
export type ThreadItem =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'new'; key: string; count: number }
  | { kind: 'message'; key: string; message: Message; read: boolean }
  | { kind: 'outbox'; key: string; item: OutboxItem };

/**
 * The thread as drawn: a day separator before each new day, the "{N} new"
 * divider above the first message of theirs after `myLastReadAt` (as it was
 * when the chat opened, so it stays put while they're read), then this
 * device's unsent messages last, in the order written. A message the server
 * has stored drops its outbox twin (same `client_id`).
 */
export function threadItems(
  messages: Message[],
  outbox: OutboxItem[],
  opts: {
    timeZone: string;
    /** My read mark when the chat opened; null: nothing read yet. */
    readMarkAtOpen: string | null | undefined;
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
  // undefined: the mark isn't known yet (no divider); null: never read.
  const mark = opts.readMarkAtOpen;
  const unseen =
    mark === undefined
      ? []
      : messages.filter(
          (m) =>
            !m.mine && !m.deleted && (mark === null || Date.parse(m.sentAt) > Date.parse(mark)),
        );
  const firstNew = unseen[0]?.id;
  for (const m of messages) {
    day(m.sentAt);
    if (m.id === firstNew) out.push({ kind: 'new', key: 'new', count: unseen.length });
    const read =
      m.mine && !!opts.theirLastReadAt && Date.parse(m.sentAt) <= Date.parse(opts.theirLastReadAt);
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

/** The design's contact-details pattern (CONTACT_RE): an email address or a phone number. */
export const CONTACT_RE = /[\w.+-]+@[\w-]+\.[\w.]+|\+?\d[\d\s().-]{7,}\d/;
