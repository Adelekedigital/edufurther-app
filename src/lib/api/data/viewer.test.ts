import { keepMockViewer } from '@/lib/utils/mockViewerParam';
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
  it('a live admin grant: isAdmin and its role (no role named yet reads as the full grant)', () => {
    expect(toViewer(me())).toMatchObject({ isAdmin: false, adminRole: null });
    expect(toViewer(me({ is_admin: true }))).toMatchObject({
      isAdmin: true,
      adminRole: 'super_admin',
    });
    const limited = { is_admin: true, admin_role: 'limited_access' } as Partial<Me>;
    expect(toViewer(me(limited))).toMatchObject({ isAdmin: true, adminRole: 'limited_access' });
  });

  it('a goal makes a mentee; no mentor profile → not a mentor', () => {
    const v = toViewer(me({ goal: {} as Me['goal'] }));
    expect(v).toMatchObject({ isMentee: true, isApprovedMentor: false, initials: 'E' });
  });

  it('two-letter initials from first and last name, as the profile header shows them', () => {
    expect(toViewer(me({ last_name: 'Adeyemi' })).initials).toBe('EA');
    expect(toViewer(me({ first_name: null, last_name: 'Adeyemi' })).initials).toBe('A');
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
      initials: 'E',
    });
  });

  it('carries sessions and credits', () => {
    const v = toViewer(
      me({
        mentee_completed_sessions: 2,
        created_at: '2026-10-10T09:00:00Z',
        credits: {
          balance: 1,
          allowance: 3,
          state: 'low',
          next_reset_at: '2026-10-01T00:00:00Z',
          monthly: { balance: 1, ceiling: 3, expires_at: '2026-10-01T00:00:00Z', unlocked: true },
          bonus: { balance: 0, groups: [] },
        },
      }),
    );
    expect(v.completedSessions).toBe(2);
    expect(v.createdAt).toBe('2026-10-10T09:00:00Z');
    expect(v.credits).toEqual({
      balance: 1,
      state: 'low',
      nextResetAt: '2026-10-01T00:00:00Z',
      monthly: { balance: 1, ceiling: 3, expiresAt: '2026-10-01T00:00:00Z', unlocked: true },
      bonus: { balance: 0, groups: [] },
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
    expect(
      toViewer(me({ profile: { avatar_focus: { x: 1.2, y: 0.3 } } as Me['profile'] })).avatarFocus,
    ).toEqual({ x: 1, y: 0.3 });
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

describe('toViewer: mentor application (Mentor Onboarding PRD)', () => {
  const profile = (over: object) =>
    ({
      approval_status: 'approved',
      listing_status: 'listed',
      ...over,
    }) as unknown as Me['mentor_profile'];

  it('carries whether the approved screen was seen; absent reads as seen', () => {
    expect(
      toViewer(me({ mentor_profile: profile({ approved_seen_at: null }) })).mentorApprovedSeen,
    ).toBe(false);
    expect(toViewer(me({ mentor_profile: profile({}) })).mentorApprovedSeen).toBe(true);
  });

  it('a declined applicant who chose mentee gets no mentor side', () => {
    const v = toViewer(
      me({ primary_role: 'mentee', mentor_profile: profile({ approval_status: 'declined' }) }),
    );
    expect(v.isMentor).toBe(false);
    expect(v.isApprovedMentor).toBe(false);
    // Declined without the switch: still their application's side.
    expect(
      toViewer(me({ mentor_profile: profile({ approval_status: 'declined' }) })).isMentor,
    ).toBe(true);
  });
});

describe('toViewer: the setup lock fields (onboardingComplete, mentorStage)', () => {
  type Profile = NonNullable<Me['mentor_profile']>;
  const profile = (p: Partial<Profile>) => p as Profile;

  it('onboardingComplete is /me onboarding.complete; unknown reads as finished', () => {
    expect(
      toViewer(me({ onboarding: { complete: false, missing: ['help'] } })).onboardingComplete,
    ).toBe(false);
    expect(toViewer(me({ onboarding: { complete: true, missing: [] } })).onboardingComplete).toBe(
      true,
    );
    expect(toViewer(me({ onboarding: null })).onboardingComplete).toBe(true);
    expect(toViewer(me()).onboardingComplete).toBe(true);
  });

  it('mentorStage follows toMentorApplication: none, unsubmitted, pending, approved, declined', () => {
    expect(toViewer(me()).mentorStage).toBe('none');
    const stage = (p: Partial<Profile>) => toViewer(me({ mentor_profile: profile(p) })).mentorStage;
    expect(stage({ approval_status: 'pending', submitted_at: null })).toBe('unsubmitted');
    expect(stage({ approval_status: 'pending', submitted_at: '2026-10-01T00:00:00Z' })).toBe(
      'pending',
    );
    expect(stage({ approval_status: 'approved', approved_seen_at: null })).toBe('approved');
    expect(stage({ approval_status: 'declined' })).toBe('declined');
  });

  it('a declined applicant who chose mentee reads as no application (mentee rules)', () => {
    const v = toViewer(
      me({ primary_role: 'mentee', mentor_profile: profile({ approval_status: 'declined' }) }),
    );
    expect(v).toMatchObject({ isMentor: false, mentorStage: 'none' });
  });

  it('approved_seen_at null is not yet seen', () => {
    const v = toViewer(
      me({ mentor_profile: profile({ approval_status: 'approved', approved_seen_at: null }) }),
    );
    expect(v).toMatchObject({ mentorStage: 'approved', mentorApprovedSeen: false });
  });
});

describe('keepMockViewer: a role redirect keeps the dev mock viewer', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    window.history.replaceState(null, '', '/');
  });

  it('carries ?mockViewer= onto the target in mock mode', () => {
    vi.stubEnv('NEXT_PUBLIC_MOCK_VIEWER', 'mentee');
    window.history.replaceState(null, '', '/home?mockViewer=mentor-review');
    expect(keepMockViewer('/mentor-application')).toBe(
      '/mentor-application?mockViewer=mentor-review',
    );
    expect(keepMockViewer('/x?a=1')).toBe('/x?a=1&mockViewer=mentor-review');
  });

  it('leaves the target alone with no param, and on every real deploy', () => {
    vi.stubEnv('NEXT_PUBLIC_MOCK_VIEWER', 'mentee');
    expect(keepMockViewer('/home')).toBe('/home');
    vi.stubEnv('NEXT_PUBLIC_MOCK_VIEWER', '');
    window.history.replaceState(null, '', '/home?mockViewer=mentor');
    expect(keepMockViewer('/dashboard')).toBe('/dashboard');
  });
});

describe('toViewer: the session limit (backend PR 3)', () => {
  it('reads /me session_type_limit; null or absent is unknown', () => {
    expect(toViewer(me({ session_type_limit: 5 })).sessionTypeLimit).toBe(5);
    expect(toViewer(me({ session_type_limit: null })).sessionTypeLimit).toBeNull();
    expect(toViewer(me()).sessionTypeLimit).toBeNull();
  });
});
