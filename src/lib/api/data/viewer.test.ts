import { toViewer } from './viewer';

type Me = Parameters<typeof toViewer>[0];
const me = (over: Partial<Me> = {}): Me =>
  ({
    id: 'u1',
    email: 'esther.a@example.com',
    first_name: 'Esther',
    goal: null,
    mentor_profile: null,
    credits: null,
    mentee_completed_sessions: 0,
    ...over,
  }) as Me;

describe('toViewer (backend auth reply #3)', () => {
  it('a goal makes a mentee; no mentor profile → not a mentor', () => {
    const v = toViewer(me({ goal: {} as Me['goal'] }));
    expect(v).toMatchObject({ isMentee: true, isApprovedMentor: false, initial: 'E' });
  });

  it('only an approved mentor profile counts — never primary_role', () => {
    const pending = me({
      primary_role: 'mentor',
      mentor_profile: { approval_status: 'pending' } as Me['mentor_profile'],
    });
    expect(toViewer(pending).isApprovedMentor).toBe(false);
    const approved = me({
      mentor_profile: { approval_status: 'approved' } as Me['mentor_profile'],
    });
    expect(toViewer(approved).isApprovedMentor).toBe(true);
  });

  it('falls back to the email name when there is no first name', () => {
    expect(toViewer(me({ first_name: null }))).toMatchObject({
      firstName: 'esther.a',
      initial: 'E',
    });
  });

  it('carries sessions and credits', () => {
    const v = toViewer(
      me({
        mentee_completed_sessions: 2,
        credits: { balance: 1, allowance: 3, state: 'low', next_reset_at: '2026-10-01T00:00:00Z' },
      }),
    );
    expect(v.completedSessions).toBe(2);
    expect(v.credits).toEqual({ balance: 1, allowance: 3, state: 'low' });
  });
});
