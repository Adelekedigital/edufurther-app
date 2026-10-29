import { chatRow, menteeRows, NOW, person } from './messagesScreen.harness';
import { noRowsKind, personLine, previewOf, rowView, visibleRows } from './chatRows';

const last = (over: object) => ({
  kind: 'text' as const,
  text: 'Hi',
  fileName: null,
  mine: false,
  at: NOW.toISOString(),
  deleted: false,
  ...over,
});

describe('previewOf (PRD "Preview", Q9)', () => {
  it.each([
    ['their text', last({}), 'Hi'],
    ['my text', last({ mine: true }), 'You: Hi'],
    [
      'a file alone',
      last({ kind: 'file', text: null, fileName: 'SOP.pdf' }),
      'Sent a file: SOP.pdf',
    ],
    [
      'my file alone',
      last({ kind: 'file', text: null, fileName: 'SOP.pdf', mine: true }),
      'You: Sent a file: SOP.pdf',
    ],
    ['text with a file', last({ kind: 'text', text: 'Here', fileName: 'SOP.pdf' }), 'Here'],
    ['their deleted one', last({ text: null, deleted: true }), 'This message was deleted'],
    ['my deleted one', last({ text: null, deleted: true, mine: true }), 'You deleted this message'],
  ])('%s', (_, l, want) => {
    expect(previewOf(chatRow({ last: l }))).toBe(want);
  });

  it('no messages yet', () => {
    expect(previewOf(chatRow({ last: null }))).toBe('No messages yet');
  });
});

describe('personLine', () => {
  it('"{Role} · {institution}", or the role alone', () => {
    expect(personLine(person())).toBe('Mentor · Central European University');
    expect(personLine(person({ role: 'mentee', institution: null }))).toBe('Mentee');
  });
});

describe('rowView', () => {
  it('names the row with its unread count and chips an upcoming booking', () => {
    const v = rowView(menteeRows()[0]!, 'Africa/Lagos', NOW);
    expect(v.label).toBe('Ujunwa Umeokeke, 2 unread');
    expect(v.chip).toMatch(/^Next: Tomorrow, /);
    // 40 minutes ago, today: the time.
    expect(v.time).toMatch(/^\d{1,2}:\d{2} (am|pm)$/);
  });

  it('no messages: no time', () => {
    expect(rowView(chatRow({ last: null }), 'Africa/Lagos', NOW).time).toBe('');
  });
});

describe('visibleRows', () => {
  const rows = menteeRows();
  const ids = (r: typeof rows) => r.map((x) => x.person.id);

  it('search is case-blind over name and institution', () => {
    expect(ids(visibleRows(rows, '  PORTS ', 'all', null))).toEqual(['u-hugh']);
    expect(ids(visibleRows(rows, 'gbenga', 'all', null))).toEqual(['u-gbenga']);
  });

  it('Unread keeps the unread and the chat kept from it', () => {
    expect(ids(visibleRows(rows, '', 'unread', null))).toEqual(['u-ujunwa']);
    expect(ids(visibleRows(rows, '', 'unread', 'u-hugh'))).toEqual(['u-ujunwa', 'u-hugh']);
  });
});

describe('noRowsKind', () => {
  it('Unread with no query is the inbox state; anything else is a search state', () => {
    expect(noRowsKind(1, '', 'unread')).toBeNull();
    expect(noRowsKind(0, '', 'unread')).toBe('unread');
    expect(noRowsKind(0, 'x', 'unread')).toBe('search');
    expect(noRowsKind(0, 'x', 'all')).toBe('search');
  });
});
