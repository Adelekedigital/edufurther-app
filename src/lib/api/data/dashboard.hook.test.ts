import { renderHook } from '@testing-library/react';
import { useUpcomingBookings } from './bookings';
import { useCalendarConnection } from './calendarConnection';
import { useMentorDashboard } from './dashboard';
import { useMentorProfile } from './profile';

vi.mock('./profile');
vi.mock('./calendarConnection');
vi.mock('./bookings');

const member = { id: 'm1', firstName: 'Gbenga' };

type ProfileRet = ReturnType<typeof useMentorProfile>;
type CalRet = ReturnType<typeof useCalendarConnection>;
type UpcRet = ReturnType<typeof useUpcomingBookings>;

const profile = (over: Record<string, unknown> = {}): ProfileRet =>
  ({
    data: {
      mentor: { completedSessions: 0, profileHref: '/mentors/m1' },
      names: { first: 'Gbenga', last: 'Adeyemi' },
      owner: { completeness: { percent: 0, missing: [] }, setupNeeded: [] },
    },
    isLoading: false,
    error: null,
    retry: () => {},
    notFound: false,
    ...over,
  }) as unknown as ProfileRet;

const cal = (over: Record<string, unknown> = {}): CalRet =>
  ({ data: null, isLoading: false, error: null, retry: () => {}, retrying: false, ...over }) as unknown as CalRet;

const upc = (over: Record<string, unknown> = {}): UpcRet =>
  ({ data: [], isLoading: false, error: null, retry: () => {}, ...over }) as unknown as UpcRet;

function run(p: ProfileRet, c: CalRet, u: UpcRet) {
  vi.mocked(useMentorProfile).mockReturnValue(p);
  vi.mocked(useCalendarConnection).mockReturnValue(c);
  vi.mocked(useUpcomingBookings).mockReturnValue(u);
  return renderHook(() => useMentorDashboard(member, 'Africa/Lagos', false)).result;
}

describe('useMentorDashboard', () => {
  it('counts only an active Google Calendar as done', () => {
    // profile + sessions done; a revoked/errored grant must still prompt a reconnect.
    expect(run(profile(), cal({ data: { status: 'error' } }), upc()).current.data?.setup.next?.key).toBe(
      'google',
    );
    expect(run(profile(), cal({ data: { status: 'active' } }), upc()).current.data?.setup.next?.key).toBe(
      'share',
    );
  });

  it('a settled-but-empty owner profile (404) yields no data, so the screen errors not crashes', () => {
    const r = run(profile({ data: null, notFound: true }), cal(), upc()).current;
    expect(r.isLoading).toBe(false);
    expect(r.error).toBeNull();
    expect(r.data).toBeNull();
  });

  it('stays loading until both profile and calendar settle', () => {
    expect(run(profile(), cal({ isLoading: true }), upc()).current.isLoading).toBe(true);
  });

  it('next session is the soonest confirmed session the mentor hosts', () => {
    const mine = { id: 's1', side: 'mentor', status: 'confirmed' };
    const theirs = { id: 's2', side: 'mentee', status: 'confirmed' };
    const r = run(
      profile({
        data: {
          mentor: { completedSessions: 3, profileHref: '/mentors/m1' },
          names: { first: 'G', last: 'A' },
          owner: { completeness: { percent: 100, missing: [] }, setupNeeded: [] },
        },
      }),
      cal(),
      upc({ data: [theirs, mine] }),
    ).current;
    expect(r.data?.isNew).toBe(false);
    expect(r.nextSession.data?.id).toBe('s1');
  });
});
