/**
 * Shared test harness for CalendarScreen's test files: the fixtures, the mocked
 * data hooks and the per-test state they return. Each test file registers the
 * mocks itself (`vi.mock(path, async () => (await import(...)).mocks.x())`,
 * hoisted by Vitest), so import order can't leave the screen on the real
 * hooks. Tests set `h.*` (e.g. `h.weekly = remote(...)`); `resetCalendar()`
 * in each file's beforeEach puts every value back.
 */
import { screen } from '@testing-library/react';
import type { Blocked, BookedDay } from '@/lib/api/data/calendar';
import type { CalendarConnection } from '@/lib/api/data/calendarConnection';
import type { Conferencing } from '@/lib/api/data/conferencing';
import type { MentorStatus } from '@/lib/api/data/mentorStatus';
import type { MentorDefaults } from '@/lib/api/data/sessionTypes';
import type { WeeklyHours } from '@/lib/api/data/weeklyHours';
import { emptyWeek } from '@/lib/utils/sessionTypeDraft';
import type { AppError, Remote, Viewer } from '@/types/mentor';
import { resetFlags } from '@/app/_shell/lockedPage.harness';

export const remote = <T,>(data: T | null, over: Partial<Remote<T>> = {}): Remote<T> => ({
  data,
  isLoading: false,
  error: null,
  retry: vi.fn(),
  ...over,
});

export const monday = () => {
  const days = emptyWeek();
  days[1] = { on: true, slots: [[1020, 1200]] };
  return days;
};
/** Monday 5:00–5:30 pm: shorter than a 60-min session. */
export const shortMonday = () => {
  const days = emptyWeek();
  days[1] = { on: true, slots: [[1020, 1050]] };
  return days;
};
export const HOURS: WeeklyHours = {
  days: monday(),
  timeZone: 'Africa/Lagos',
  rules: [],
  otherZones: [],
  otherSlots: [],
};
export const DEFAULTS: MentorDefaults = {
  durationMin: 60,
  noticeHours: 24,
  windowDays: 56,
  breakMin: 15,
  requiresApproval: true,
  maxWindowDays: 56,
};

export const mentor = (over: Partial<Extract<Viewer, { kind: 'member' }>> = {}): Viewer => ({
  kind: 'member',
  id: 'm1',
  firstName: 'Gbenga',
  initials: 'G',
  isMentee: false,
  isApprovedMentor: true,
  isMentor: true,
  isListedMentor: true,
  completedSessions: 0,
  credits: null,
  avatarUrl: null,
  avatarFocus: null,
  coverKey: null,
  awaitingResponse: null,
  ...over,
});

// The mutations: one spy each, reset by resetCalendar().
export const saveHours = vi.fn();
export const resetSave = vi.fn();
export const saveDefaults = vi.fn();
export const pause = vi.fn();
export const resume = vi.fn();
export const saveVideo = vi.fn();
export const saveBlocked = vi.fn();

type OwnTypes = {
  data: { durationMin: number; isLive: boolean; usesOwnWindows: boolean }[] | null;
  isLoading?: boolean;
  error?: { kind: string; message: string } | null;
  retry?: () => void;
};

const fresh = () => ({
  viewer: mentor(),
  weekly: remote(HOURS),
  defaults: { ...remote(DEFAULTS), refreshing: false } as Remote<MentorDefaults> & {
    refreshing: boolean;
  },
  saveHoursError: null as AppError | null,
  defaultsPending: false,
  // The types offered: Calendar hours must fit the shortest.
  ownTypes: { data: [] } as OwnTypes,
  status: remote<MentorStatus>({
    approved: true,
    listed: true,
    pausedByMentor: false,
    returnOn: null,
  }),
  pauseError: null as AppError | null,
  resumePending: false,
  video: remote<Conferencing>({
    provider: 'daily',
    customUrl: null,
    isDefault: true,
  }) as Remote<Conferencing> & {
    retrying?: boolean;
  },
  saveVideoError: null as AppError | null,
  booked: remote<BookedDay[]>([]),
  /** What the screen last asked the booked-days hook for. */
  bookedRange: null as { from: string; to: string } | null,
  bookedUser: null as string | null,
  /**
   * The Google grant behind the reconnect banner. Null by default, so the
   * banner stays out of every test that isn't about it; set
   * `h.connection = remote(brokenGrant())` to bring it on.
   */
  connection: remote<CalendarConnection | null>(null),
  blocked: remote<Blocked>({ days: [], exceptions: [] }),
  blockedPending: false,
  blockedError: null as AppError | null,
});

/** What the mocked hooks return in the current test. */
/** A grant the backend has marked broken: the only state the banner shows for. */
export const brokenGrant = (over: Partial<CalendarConnection> = {}): CalendarConnection => ({
  connectedAt: '2026-10-01T09:00:00Z',
  status: 'error',
  lastSyncedAt: null,
  fault: 'revoked',
  accountEmail: 'team@edufurther.com',
  ...over,
});

export const h = fresh();

export function resetCalendar() {
  Object.assign(h, fresh());
  resetFlags();
  saveHours.mockReset().mockResolvedValue(undefined);
  saveDefaults.mockReset().mockResolvedValue(DEFAULTS);
  resetSave.mockReset();
  saveBlocked.mockReset().mockResolvedValue(undefined);
  pause.mockReset().mockResolvedValue(undefined);
  resume.mockReset().mockResolvedValue(undefined);
  saveVideo.mockReset().mockResolvedValue(undefined);
}

export const tuesdaySwitch = () => screen.getByRole('switch', { name: 'Tuesday' });
/** What the page's live region last read out. */
export const announced = () =>
  screen
    .getAllByRole('status')
    .map((s) => s.textContent)
    .join(' | ');

/** The mocked modules, by path; each test file registers them with vi.mock. */
export const mocks = {
  navigation: () => ({
    usePathname: () => '/calendar',
    useRouter: () => ({ push: vi.fn() }),
  }),
  appShell: async () => {
    const { accessFor } = await import('@/lib/utils/access');
    return {
      useAppShell: () => ({
        access: accessFor(h.viewer),
        viewer: h.viewer,
        member: h.viewer.kind === 'member' ? h.viewer : null,
        chrome: h.viewer.kind === 'guest' ? 'guest' : 'member',
        account: undefined,
        nav: h.viewer.kind === 'member' && h.viewer.isMentor ? 'mentor' : 'unknown',
      }),
    };
  },
  weeklyHours: () => ({
    useWeeklyHours: () => h.weekly,
    useSaveWeeklyHours: () => ({
      save: saveHours,
      isPending: false,
      error: h.saveHoursError,
      reset: resetSave,
    }),
  }),
  sessionTypes: () => ({
    useOwnSessionTypes: () => ({ isLoading: false, error: null, retry: vi.fn(), ...h.ownTypes }),
    useMentorDefaults: () => h.defaults,
    useSaveMentorDefaults: () => ({
      save: saveDefaults,
      isPending: h.defaultsPending,
      error: null,
      reset: vi.fn(),
    }),
  }),
  /**
   * The banner's fetch. Without it every file that renders the screen throws
   * "No QueryClient set", because this is the screen's only real React Query
   * hook; the rest of the data layer is mocked here.
   */
  calendarConnection: () => ({
    useCalendarConnection: () => h.connection,
    readCalendarConnection: vi.fn(),
    useStartCalendarConnect: () => ({ start: vi.fn() }),
    useDisconnectCalendar: () => ({
      disconnect: vi.fn(),
      isPending: false,
      error: null,
      reset: vi.fn(),
    }),
    useRefreshAfterConnect: () => vi.fn(),
  }),
  mentorStatus: () => ({
    useMentorStatus: () => h.status,
    usePause: () => ({ pause, isPending: false, error: h.pauseError, reset: vi.fn() }),
    useResume: () => ({ resume, isPending: h.resumePending, error: null, reset: vi.fn() }),
  }),
  conferencing: () => ({
    useConferencing: () => h.video,
    useSaveConferencing: () => ({
      save: saveVideo,
      isPending: false,
      error: h.saveVideoError,
      reset: vi.fn(),
    }),
  }),
  calendar: () => ({
    useBookedDays: (...a: unknown[]) => {
      h.bookedRange = a[2] as { from: string; to: string };
      h.bookedUser = a[0] as string | null;
      return h.booked;
    },
    useBlockedDays: () => h.blocked,
    useSaveBlockedDays: () => ({
      save: saveBlocked,
      isPending: h.blockedPending,
      error: h.blockedError,
      reset: vi.fn(),
    }),
  }),
};
