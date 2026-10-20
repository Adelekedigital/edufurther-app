import { bookBlockedFor, canBookFor } from './bookBlocked';
import { flags, resetFlags, viewers } from './lockedPage.harness';

// The setup lock's flags, switchable per test (lockedPage.harness).
vi.mock('@/lib/config/auth', async (orig) =>
  (await import('./lockedPage.harness')).authFlags(await orig()),
);
afterEach(resetFlags);

describe('bookBlockedFor', () => {
  it('guests and members can book (guests sign up inside the flow)', () => {
    expect(bookBlockedFor({ kind: 'guest' })).toBeNull();
    expect(
      bookBlockedFor({
        kind: 'member',
        id: 'u1',
        firstName: 'Ada',
        initials: 'A',
        isMentee: true,
        isApprovedMentor: false,
        isMentor: false,
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

describe('canBookFor (product, 2026-09-29: mentors can’t book)', () => {
  const member = (isMentor: boolean) =>
    ({
      kind: 'member',
      id: 'u1',
      firstName: 'Ada',
      initials: 'A',
      isMentee: true,
      isApprovedMentor: false,
      isMentor,
      completedSessions: 0,
      credits: null,
    }) as const;
  it('a mentor in any state cannot; mentees, guests and unknown viewers can', () => {
    expect(canBookFor(member(true))).toBe(false);
    expect(canBookFor(member(false))).toBe(true);
    expect(canBookFor({ kind: 'guest' })).toBe(true);
    expect(canBookFor({ kind: 'loading', signedIn: true })).toBe(true);
  });

  it('a mentor sign-up who hasn’t applied can’t either: one role per account', () => {
    expect(canBookFor(viewers.mentorSignup)).toBe(false);
    expect(canBookFor(viewers.mentorUnfinished)).toBe(false);
    // An unfinished mentee still can (the flow offers Finish setup).
    expect(canBookFor(viewers.menteeUnfinished)).toBe(true);
  });

  it('with mentor onboarding off, a mentor sign-up books as a mentee (no lock, no dead end)', () => {
    flags.mentor = false;
    expect(canBookFor(viewers.mentorSignup)).toBe(true);
  });
});
