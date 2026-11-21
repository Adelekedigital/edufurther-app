import type { Viewer } from '@/types/mentor';
import { completeForCredit, sheetRowFor } from './completeForCredit';

type Member = Extract<Viewer, { kind: 'member' }>;

const credits = (balance: number): Member['credits'] => ({
  balance,
  state: balance ? 'on_track' : 'exhausted',
  nextResetAt: null,
  monthly: { balance, ceiling: 1, level: 1, expiresAt: null, unlocked: false },
  bonus: { balance: 0, groups: [] },
});

/** One of the migrated mentees: onboarded, no goal, no credits, three answers owed. */
const member = (over: Partial<Member> = {}): Member =>
  ({
    kind: 'member',
    id: 'u1',
    firstName: 'Esther',
    initials: 'EA',
    isMentee: false,
    isApprovedMentor: false,
    isMentor: false,
    onboardingComplete: true,
    onboardingMissing: ['help', 'degree', 'field'],
    completedSessions: 0,
    credits: credits(0),
    ...over,
  }) as Member;

describe('completeForCredit', () => {
  it('all four together: onboarded, no credits, answers owed, no goal', () => {
    expect(completeForCredit(member())).toBe(true);
  });

  it('onboarding not complete: no', () => {
    expect(completeForCredit(member({ onboardingComplete: false }))).toBe(false);
    // Unknown is not complete here (toViewer reads it as finished for the lock only).
    expect(completeForCredit(member({ onboardingComplete: undefined }))).toBe(false);
  });

  it('any credit held, or credits unknown: no', () => {
    expect(completeForCredit(member({ credits: credits(1) }))).toBe(false);
    expect(completeForCredit(member({ credits: null }))).toBe(false);
  });

  it('nothing owed, or not known what is: no', () => {
    expect(completeForCredit(member({ onboardingMissing: [] }))).toBe(false);
    expect(completeForCredit(member({ onboardingMissing: undefined }))).toBe(false);
  });

  it('a mentee goal on /me (a full member who spent down): no, the credit would not come', () => {
    expect(completeForCredit(member({ isMentee: true, onboardingMissing: ['field'] }))).toBe(false);
  });

  it('a mentor in any state, or a mentor sign-up: no', () => {
    expect(completeForCredit(member({ isMentor: true }))).toBe(false);
    expect(completeForCredit(member({ signedUpAsMentor: true }))).toBe(false);
  });

  it('no member (loading, error, guest): no', () => {
    expect(completeForCredit(null)).toBe(false);
    expect(completeForCredit(undefined)).toBe(false);
  });
});

describe('sheetRowFor', () => {
  it('help opens its own row; origin, degree and field open "What you’re applying for"', () => {
    expect(sheetRowFor(['help', 'origin'])).toBe('help');
    expect(sheetRowFor(['origin', 'degree'])).toBe('target');
    expect(sheetRowFor(['degree'])).toBe('target');
    expect(sheetRowFor(['field'])).toBe('target');
    expect(sheetRowFor([])).toBeUndefined();
    expect(sheetRowFor(undefined)).toBeUndefined();
  });
});
