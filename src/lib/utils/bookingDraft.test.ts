import {
  clearAllBookingDrafts,
  clearBookingDraft,
  markBookingDraftFinished,
  readBookingDraft,
  saveBookingDraft,
} from './bookingDraft';

const draft = {
  mentorId: 'm1',
  handle: 'chidi',
  sessionTypeId: 'st1',
  time: '2026-10-20T09:00:00Z',
  answers: { q1: { text: 'Applying for Fall 2027' } },
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  window.sessionStorage.clear();
});

describe('bookingDraft', () => {
  it('keeps a booking per account, for this tab', () => {
    saveBookingDraft('u1', draft);
    expect(readBookingDraft('u1')).toMatchObject(draft);
    // Another account on the same tab never sees it.
    expect(readBookingDraft('u2')).toBeNull();
  });

  it('marks it finished (for its own mentor only), and clears it', () => {
    saveBookingDraft('u1', draft);
    markBookingDraftFinished('u1', 'someone-else');
    expect(readBookingDraft('u1')?.finished).toBeUndefined();
    markBookingDraftFinished('u1', 'chidi');
    expect(readBookingDraft('u1')?.finished).toBe(true);
    clearBookingDraft('u1');
    expect(readBookingDraft('u1')).toBeNull();
  });

  it('drops one older than a day, and anything that isn’t a draft', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-18T10:00:00Z'));
    saveBookingDraft('u1', draft);
    vi.setSystemTime(new Date('2026-10-19T10:00:01Z'));
    expect(readBookingDraft('u1')).toBeNull();
    window.sessionStorage.setItem('ef-booking-draft:u1', '{"mentorId":1}');
    expect(readBookingDraft('u1')).toBeNull();
    window.sessionStorage.setItem('ef-booking-draft:u1', 'not json');
    expect(readBookingDraft('u1')).toBeNull();
  });

  it('refuses a tampered time or handle, and drops answers of the wrong shape', () => {
    saveBookingDraft('u1', { ...draft, time: 'javascript:1' });
    expect(readBookingDraft('u1')).toBeNull();
    saveBookingDraft('u1', { ...draft, handle: '../admin' });
    expect(readBookingDraft('u1')).toBeNull();
    saveBookingDraft('u1', {
      ...draft,
      answers: { q1: { text: 'ok' }, q2: { text: 3 } as never, q3: 'x' as never },
    });
    expect(readBookingDraft('u1')?.answers).toEqual({ q1: { text: 'ok' } });
  });

  it('keeps its clock when rewritten, and sign-out clears every draft in the tab', () => {
    saveBookingDraft('u1', draft);
    const first = readBookingDraft('u1')!;
    saveBookingDraft('u1', { ...first, finished: false });
    expect(readBookingDraft('u1')?.savedAt).toBe(first.savedAt);
    saveBookingDraft('u2', draft);
    window.sessionStorage.setItem('other-key', 'stays');
    clearAllBookingDrafts();
    expect(readBookingDraft('u1')).toBeNull();
    expect(readBookingDraft('u2')).toBeNull();
    expect(window.sessionStorage.getItem('other-key')).toBe('stays');
  });

  it('works without storage: nothing kept, nothing thrown', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => saveBookingDraft('u1', draft)).not.toThrow();
    expect(readBookingDraft('u1')).toBeNull();
    expect(() => markBookingDraftFinished('u1', 'chidi')).not.toThrow();
  });
});
