import type { Message, OutboxItem } from '@/types/messages';
import { CONTACT_RE, newestTheirs, threadItems } from './threadItems';

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
      readMarkAtOpen: undefined,
    });
    expect(items.map((i) => (i.kind === 'day' ? i.label : i.kind))).toEqual([
      'Yesterday',
      'message',
      'Today',
      'message',
      'message',
    ]);
  });

  it('"{N} new" sits above the first unread of theirs, counted from the mark when the chat opened', () => {
    const msgs = [
      m('a', false, 5),
      m('b', true, 4),
      m('c', false, 3),
      m('d', false, 2, { deleted: true }),
      m('e', false, 1),
    ];
    const items = threadItems(msgs, [], { ...opts, readMarkAtOpen: at(4.5) });
    const i = items.findIndex((x) => x.kind === 'new');
    expect(items[i]).toMatchObject({ kind: 'new', count: 2 });
    expect(items[i + 1]).toMatchObject({ kind: 'message', key: 'c' });
    // Never read: every one of theirs is new. Not known yet: no divider.
    expect(
      threadItems(msgs, [], { ...opts, readMarkAtOpen: null }).find((x) => x.kind === 'new'),
    ).toMatchObject({ count: 3 });
    expect(
      threadItems(msgs, [], { ...opts, readMarkAtOpen: undefined }).some((x) => x.kind === 'new'),
    ).toBe(false);
  });

  it('mine read up to their read mark', () => {
    const items = threadItems([m('a', true, 5), m('b', true, 1)], [], {
      ...opts,
      readMarkAtOpen: undefined,
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
      readMarkAtOpen: undefined,
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

describe('CONTACT_RE (the design’s pattern)', () => {
  it.each([
    ['an email', 'write to ada@mail.com', true],
    ['a phone number', 'call +234 803 123 4567', true],
    ['a year and a time', 'Fall 2027 at 3pm', false],
  ])('%s', (_, text, hit) => {
    expect(CONTACT_RE.test(text)).toBe(hit);
  });
});
