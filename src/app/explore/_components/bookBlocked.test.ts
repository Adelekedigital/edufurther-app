import { bookBlockedFor } from './bookBlocked';

describe('bookBlockedFor', () => {
  it('guests and members can book (guests sign up inside the flow)', () => {
    expect(bookBlockedFor({ kind: 'guest' })).toBeNull();
    expect(
      bookBlockedFor({
        kind: 'member',
        id: 'u1',
        firstName: 'Ada',
        initial: 'A',
        isMentee: true,
        isApprovedMentor: false,
        completedSessions: 0,
        credits: null,
      }),
    ).toBeNull();
  });

  it('session not known yet: nothing to block (no chrome either)', () => {
    expect(bookBlockedFor({ kind: 'loading', signedIn: null })).toBeNull();
  });

  it('signed in but /me not answered: waits', () => {
    expect(bookBlockedFor({ kind: 'loading', signedIn: true })).toBe('Loading your account…');
  });

  it('every account problem blocks with its reason', () => {
    expect(bookBlockedFor({ kind: 'error', retry: () => {}, retrying: false })).toBe(
      'Can’t book right now',
    );
    expect(bookBlockedFor({ kind: 'unlinked' })).toBe('Finish account setup to book');
    expect(bookBlockedFor({ kind: 'accountExists' })).toBe('Contact support to book');
  });
});
