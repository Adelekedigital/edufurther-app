import { renderHook } from '@testing-library/react';
import { useUpcomingBookings } from './bookings';
import { useCalendarConnection } from './calendarConnection';
import { useMentorDashboard } from './dashboard';
import { useMentorStats, type StatBlock } from './mentorStats';
import { useMentorProfile } from './profile';

vi.mock('./profile');
vi.mock('./calendarConnection');
vi.mock('./bookings');
vi.mock('./mentorStats');

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
  ({
    data: null,
    isLoading: false,
    error: null,
    retry: () => {},
    retrying: false,
    ...over,
  }) as unknown as CalRet;

const upc = (over: Record<string, unknown> = {}): UpcRet =>
  ({ data: [], isLoading: false, error: null, retry: () => {}, ...over }) as unknown as UpcRet;

type StatsRet = ReturnType<typeof useMentorStats>;
const noStats = {
  data: null,
  isLoading: false,
  error: null,
  retry: () => {},
} as unknown as StatsRet;
const statBlock = (over: Partial<StatBlock> = {}): StatBlock => ({
  since: '2026-09-14',
  until: '2026-10-14',
  completedSessions: 0,
  mentoringMinutes: 0,
  menteesMentored: 0,
  attendanceRate: null,
  missedByMentor: 0,
  menteesLeftWaiting: 0,
  missedByMentee: 0,
  cancelledByMentor: 0,
  reviewCount: 0,
  averageRating: null,
  ...over,
});
const windowStats = (current: Partial<StatBlock>, previous: Partial<StatBlock>): StatsRet =>
  ({
    data: { windowDays: 30, current: statBlock(current), previous: statBlock(previous) },
    isLoading: false,
    error: null,
    retry: () => {},
  }) as unknown as StatsRet;

function run(
  p: ProfileRet,
  c: CalRet,
  u: UpcRet,
  stats?: { monthly: StatsRet; quarterly: StatsRet },
) {
  vi.mocked(useMentorProfile).mockReturnValue(p);
  vi.mocked(useCalendarConnection).mockReturnValue(c);
  vi.mocked(useUpcomingBookings).mockReturnValue(u);
  // useMentorDashboard fetches a 30-day ("this month") and a 90-day ("this
  // quarter") window; without a QueryClient the real useQuery throws, so mock it.
  vi.mocked(useMentorStats).mockImplementation((_id, q) =>
    'windowDays' in q && q.windowDays === 30
      ? (stats?.monthly ?? noStats)
      : (stats?.quarterly ?? noStats),
  );
  return renderHook(() => useMentorDashboard(member, 'Africa/Lagos', false)).result;
}

describe('useMentorDashboard', () => {
  it('counts only an active Google Calendar as done', () => {
    // profile + sessions done; a revoked/errored grant must still prompt a reconnect.
    expect(
      run(profile(), cal({ data: { status: 'error' } }), upc()).current.data?.setup.next?.key,
    ).toBe('google');
    expect(
      run(profile(), cal({ data: { status: 'active' } }), upc()).current.data?.setup.next?.key,
    ).toBe('share');
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

  it('a new mentor surfaces a calendar FETCH error (with retry), not a silent regression', () => {
    const r = run(profile(), cal({ error: { kind: 'server' } }), upc()).current;
    expect(r.error).toBeTruthy();
    expect(r.data).toBeNull();
  });

  it('an active mentor is not blocked or hidden by a calendar fetch error', () => {
    const r = run(
      profile({
        data: {
          mentor: { completedSessions: 3, profileHref: '/mentors/m1' },
          names: { first: 'G', last: 'A' },
          owner: { completeness: { percent: 100, missing: [] }, setupNeeded: [] },
        },
      }),
      cal({ error: { kind: 'server' } }),
      upc(),
    ).current;
    expect(r.error).toBeNull();
    expect(r.data).not.toBeNull();
  });

  it('attaches a KPI trend to the matching metric once a stats window loads', () => {
    const r = run(
      profile({
        data: {
          mentor: { completedSessions: 4, profileHref: '/mentors/m1' },
          names: { first: 'G', last: 'A' },
          owner: { completeness: { percent: 100, missing: [] }, setupNeeded: [] },
        },
      }),
      cal(),
      upc(),
      {
        monthly: windowStats({ completedSessions: 4 }, { completedSessions: 3 }),
        quarterly: noStats,
      },
    ).current;
    expect(r.metrics?.find((k) => k.key === 'sessions')?.trend).toEqual({
      text: '+1 this month',
      icon: 'trending_up',
      tone: 'positive',
    });
  });
});
