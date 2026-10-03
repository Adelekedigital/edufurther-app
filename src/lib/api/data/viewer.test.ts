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

  it('any mentor profile, in any state, is a mentor for navigation and session types', () => {
    expect(toViewer(me()).isMentor).toBe(false);
    const pending = me({ mentor_profile: { approval_status: 'pending' } as Me['mentor_profile'] });
    expect(toViewer(pending)).toMatchObject({ isMentor: true, isApprovedMentor: false });
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
        credits: {
          balance: 1,
          allowance: 3,
          state: 'low',
          next_reset_at: '2026-10-01T00:00:00Z',
          // Backend 344 split the balance into a monthly allowance and bonus
          // grants. toViewer reads neither yet; they are here because the
          // contract requires them.
          monthly: { balance: 1, ceiling: 3, expires_at: '2026-10-01T00:00:00Z' },
          bonus: { balance: 0, groups: [] },
        },
      }),
    );
    expect(v.completedSessions).toBe(2);
    expect(v.credits).toEqual({
      balance: 1,
      allowance: 3,
      state: 'low',
      nextResetAt: '2026-10-01T00:00:00Z',
    });
  });

  it('carries the photo, its focus and the cover colour for the sidebar avatar', () => {
    const v = toViewer(
      me({
        profile: {
          avatar_url: 'https://x.supabase.co/a.webp',
          avatar_focus: { x: 0.4, y: 0.3 },
          cover_color: 'mint',
        } as Me['profile'],
      }),
    );
    expect(v).toMatchObject({
      avatarUrl: 'https://x.supabase.co/a.webp',
      avatarFocus: { x: 0.4, y: 0.3 },
      coverKey: 'mint',
    });
    expect(toViewer(me({ profile: null })).coverKey).toBeNull();
  });

  it('the Bookings count follows the nav role: a mentor profile uses the mentor count', () => {
    const counts = {
      as_mentor: { awaiting_your_response: 4, upcoming: 9 },
      as_mentee: { awaiting_mentor: 2, upcoming: 1 },
    } as Me['booking_counts'];
    const mentor = me({
      booking_counts: counts,
      mentor_profile: { approval_status: 'pending' } as Me['mentor_profile'],
    });
    expect(toViewer(mentor).awaitingResponse).toBe(4);
    expect(toViewer(me({ booking_counts: counts })).awaitingResponse).toBe(2);
    expect(
      toViewer(me({ booking_counts: { as_mentor: null, as_mentee: null } })).awaitingResponse,
    ).toBeNull();
  });
});
