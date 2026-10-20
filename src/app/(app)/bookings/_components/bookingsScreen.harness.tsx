/**
 * Shared test harness for BookingsScreen's test files: the mocked data hooks
 * and the per-test state they return. Each test file registers the mocks
 * itself (`vi.mock(path, () => mocks.x())`, hoisted by Vitest), so import
 * order cannot leave the screen on the real hooks - the same shape
 * `profileScreen.harness.tsx` uses.
 *
 * Tests set `h.*` (e.g. `h.pending = remote([...])`); `resetHarness` in
 * `beforeEach` puts it all back.
 */
import type { BookingHistoryResult } from '@/lib/api/data/bookings';
import { accessFor } from '@/lib/utils/access';
import type { Booking, BookingAnswer, BookingParty } from '@/types/booking';
import type { Remote, Viewer } from '@/types/mentor';

export const remote = <T,>(data: T | null, over: Partial<Remote<T>> = {}): Remote<T> => ({
  data,
  isLoading: false,
  error: null,
  retry: vi.fn(),
  ...over,
});

export const hist = (over: Partial<BookingHistoryResult> = {}): BookingHistoryResult => ({
  bookings: [],
  isLoading: false,
  error: null,
  retry: vi.fn(),
  hasMore: false,
  isLoadingMore: false,
  loadMoreError: null,
  loadMore: vi.fn(),
  ...over,
});

export const NOW = new Date('2026-10-03T12:00:00Z');
export const at = (h: number) => new Date(NOW.getTime() + h * 3_600_000).toISOString();
export const party = (name = 'Amara Okafor'): BookingParty => ({
  id: 'p1',
  name,
  firstName: name.split(' ')[0]!,
  initials: 'AO',
  avatarUrl: null,
  avatarFocus: null,
  deleted: false,
  timeZone: 'Africa/Lagos',
  cover: 'sand',
  degree: null,
  institution: null,
  joinedAt: null,
  inRoomAt: null,
  attendance: 'pending' as const,
});

export const booking = (over: Partial<Booking> = {}): Booking => ({
  id: 'b1',
  status: 'confirmed',
  side: 'mentor',
  other: party(),
  myAttendance: 'pending' as const,
  myJoinedAt: null,
  startsAt: at(24),
  endsAt: at(25),
  durationMin: 60,
  title: 'School shortlist',
  note: null,
  answersPreview: null,
  suggestion: null,
  sessionTypeId: 'st1',
  createdAt: at(-240),
  respondBy: null,
  joinOpensAt: null,
  joinClosesAt: null,
  doorClosesAt: null,
  refundUntil: null,
  menteeAttendanceRate: null,
  menteeAttendanceSessions: 0,
  ...over,
});

export const MEMBER: Extract<Viewer, { kind: 'member' }> = {
  kind: 'member',
  id: 'me',
  firstName: 'Gbenga',
  initials: 'G',
  isMentee: false,
  isApprovedMentor: true,
  isMentor: true,
  completedSessions: 0,
  credits: null,
  timeZone: 'Africa/Lagos',
  bookingCounts: { pending: 2, upcoming: 3 },
};

export const replace = vi.fn();
export const push = vi.fn();

export function stubAction() {
  return { mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null, variables: undefined };
}
/** The four write actions, stubbed at the data boundary like every read here. */
export const actions: Record<string, ReturnType<typeof stubAction>> = {};

type Answers = {
  data: BookingAnswer[] | undefined;
  isLoading: boolean;
  error: unknown;
  retry: () => void;
};
type Reviewable = {
  data: { id: string }[] | null;
  isLoading: boolean;
  error: unknown;
  retry: () => void;
};

/** Everything a test varies. Read lazily by the mocks, so assignment is enough. */
export const h = {
  tab: 'upcoming',
  selectedBooking: null as string | null,
  viewer: null as unknown as Viewer,
  upcoming: null as unknown as Remote<Booking[]>,
  pending: null as unknown as Remote<Booking[]>,
  history: null as unknown as BookingHistoryResult,
  answers: null as unknown as Answers,
  reviewable: null as unknown as Reviewable,
  /** What `useBooking` was asked to do: the panel must not refetch a loaded row. */
  bookingActive: false,
  /** The screen reads `matchMedia` to choose aside vs sheet. */
  narrow: false,
};

export const mocks = {
  navigation: () => ({
    usePathname: () => '/bookings',
    useRouter: () => ({ replace, push }),
    useSearchParams: () => {
      const q = new URLSearchParams(h.tab === 'upcoming' ? '' : `tab=${h.tab}`);
      if (h.selectedBooking) q.set('booking', h.selectedBooking);
      return q;
    },
  }),
  appShell: () => ({
    useAppShell: () => ({
      access: accessFor(h.viewer),
      viewer: h.viewer,
      member: h.viewer.kind === 'member' ? h.viewer : null,
      chrome: h.viewer.kind === 'guest' ? 'guest' : 'member',
      account: undefined,
      nav: h.viewer.kind === 'member' && h.viewer.isMentor ? 'mentor' : 'mentee',
    }),
  }),
  bookings: () => ({
    useUpcomingBookings: () => h.upcoming,
    usePendingBookings: () => h.pending,
    useBookingHistory: () => h.history,
    useBooking: (_id: string | null, _userId: string | null, active: boolean) => {
      h.bookingActive = active;
      return { data: null, isLoading: false, error: null, retry: vi.fn() };
    },
  }),
  sessionEvents: () => ({
    useBookingOutcome: () => ({ data: null, isLoading: false, error: null, retry: vi.fn() }),
  }),
  // Typed, not `unknown`: an untyped stub let a new required field
  // (`answered`, backend #412) go missing here while typecheck stayed green,
  // and every answer then rendered as "No answer".
  sessionAnswers: () => ({ useBookingAnswers: () => h.answers }),
  bookingActions: () => ({ useBookingAction: (a: string) => (actions[a] ??= stubAction()) }),
  reviewableSessions: () => ({ useMyReviewableSessions: () => h.reviewable }),
  intakeFiles: () => ({
    useIntakeFile: () => ({ url: 'blob:stub', isLoading: false, error: null, retry: vi.fn() }),
    canPreview: () => true,
  }),
};

export function resetHarness() {
  vi.setSystemTime(NOW);
  h.narrow = false;
  // jsdom has no matchMedia. Follows the stub ExploreScreen.test.tsx uses.
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: h.narrow,
    media: q,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  h.tab = 'upcoming';
  h.selectedBooking = null;
  h.bookingActive = false;
  h.viewer = MEMBER;
  h.upcoming = remote<Booking[]>([]);
  h.pending = remote<Booking[]>([]);
  h.history = hist();
  h.answers = { data: [], isLoading: false, error: null, retry: vi.fn() };
  h.reviewable = { data: [], isLoading: false, error: null, retry: vi.fn() };
  for (const a of ['accept', 'decline', 'withdraw', 'cancel']) actions[a] = stubAction();
  push.mockReset();
  replace.mockReset();
}
