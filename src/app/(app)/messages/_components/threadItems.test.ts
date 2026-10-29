import type { Message, OutboxItem } from '@/types/messages';
import { newDivider, newestTheirs, threadItems } from './threadItems';

const NOW = new Date('2026-10-27T12:00:00Z');
const at = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();
const m = (id: string, mine: boolean, h: number, over: Partial<Message> = {}): Message => ({
  id,
  clientId: null,
  mine,
  body: id,
  file: null,
  sentAt: at(h),
  editedAt: null,
  deleted: false,
  ...over,
});
const opts = { timeZone: 'UTC', theirLastReadAt: null, now: NOW };

describe('threadItems', () => {
  it('a day separator before each new day, in the app’s words', () => {
    const items = threadItems([m('a', false, 30), m('b', true, 2), m('c', false, 1)], [], {
      ...opts,
      divider: null,
    });
    expect(items.map((i) => (i.kind === 'day' ? i.label : i.kind))).toEqual([
      'Yesterday',
      'message',
      'Today',
      'message',
      'message',
    ]);
  });

  it('"{N} new" is worked out at open: above the first unread of theirs, counting those', () => {
    const msgs = [
      m('a', false, 5),
      m('b', true, 4),
      m('c', false, 3),
      m('d', false, 2, { deleted: true }),
      m('e', false, 1),
    ];
    const divider = newDivider(msgs, at(4.5));
    expect(divider).toEqual({ id: 'c', count: 2 });
    const items = threadItems(msgs, [], { ...opts, divider });
    const i = items.findIndex((x) => x.kind === 'new');
    expect(items[i + 1]).toMatchObject({ kind: 'message', key: 'c' });
    // A message arriving later doesn't move or grow it: it was fixed at open.
    const later = threadItems([...msgs, m('f', false, 0.5)], [], { ...opts, divider });
    expect(later.find((x) => x.kind === 'new')).toMatchObject({ count: 2 });
    // Never read: every one of theirs is new. All read: none.
    expect(newDivider(msgs, null)).toEqual({ id: 'a', count: 3 });
    expect(newDivider(msgs, at(0))).toBeNull();
  });

  it('mine read up to their read mark', () => {
    const items = threadItems([m('a', true, 5), m('b', true, 1)], [], {
      ...opts,
      divider: null,
      theirLastReadAt: at(3),
    });
    const read = items.flatMap((i) => (i.kind === 'message' ? [i.read] : []));
    expect(read).toEqual([true, false]);
  });

  it('unsent ones come last, and one the server has stored drops its outbox twin', () => {
    const box: OutboxItem[] = [
      {
        clientId: 'k1',
        to: 'u',
        body: 'stored',
        file: null,
        createdAt: at(0.5),
        status: 'sending',
      },
      {
        clientId: 'k2',
        to: 'u',
        body: 'waiting',
        file: null,
        createdAt: at(0.2),
        status: 'waiting',
      },
    ];
    const items = threadItems([m('a', true, 0.5, { clientId: 'k1' })], box, {
      ...opts,
      divider: null,
    });
    expect(items.filter((i) => i.kind === 'outbox').map((i) => i.key)).toEqual(['k2']);
  });
});

describe('newestTheirs', () => {
  it('the newest message of theirs, or null', () => {
    expect(newestTheirs([m('a', false, 3), m('b', false, 2), m('c', true, 1)])?.id).toBe('b');
    expect(newestTheirs([m('c', true, 1)])).toBeNull();
  });
});
