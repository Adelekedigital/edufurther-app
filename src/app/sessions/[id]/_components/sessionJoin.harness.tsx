/**
 * Shared test harness for the Session Join screen (as lockedPage.harness): the
 * state the mocked hooks read, the fixtures, and the per-test reset. Each test
 * file registers the mocks itself (Vitest hoists `vi.mock`), reaching this file
 * through a dynamic import. Nothing here imports the screen, so a mock factory
 * loading this file never waits on the module it mocks.
 */
import { sampleBookingFor, sampleParty } from '@/lib/utils/bookingTestFixtures';
import type { BookingAnswer, SessionRoom } from '@/types/booking';
import type { Remote, SessionType, Viewer } from '@/types/mentor';
import type { MoveCallbacks, MoveError, MoveRequest } from '@/lib/api/data/moveSession';
import {
  resetReviewAndRebook,
  reviewAndRebookMocks,
} from '@/app/_sessions/reviewAndRebook.harness';

export { launched, sent } from '@/app/_sessions/reviewAndRebook.harness';

/** What the mocked hooks read, set per test. */
export const h = {
  viewer: null as unknown as Viewer,
  room: null as unknown as Remote<SessionRoom>,
  answers: null as unknown as Remote<BookingAnswer[]>,
  // Whether this session can still be reviewed (the list Bookings reads too).
  reviewables: null as unknown as Remote<
    { id: string; startsAt: string; typeName: string | null }[]
  >,
  // What the entry route sent the page back with (`?enter=`), if anything.
  search: new URLSearchParams(),
  // jsdom has no matchMedia; Add to calendar reads it to choose menu vs phone
  // sheet. Desktop unless a test says otherwise. Follows BookingsScreen.test.tsx.
  phone: false,
  /** The mentor's session types (useSessionTypes), for the mentee's move. */
  types: [] as SessionType[],
  typesLoading: false,
  /** The open times the cancel dialog's picker lists. */
  slots: [] as string[],
};

/** The mentee's move (useMoveSession): each press recorded, the outcome up to the test. */
export const moveHook = {
  calls: [] as { req: MoveRequest; cb: MoveCallbacks }[],
  isPending: false,
  error: null as MoveError | null,
  reset: vi.fn(),
};

// A tiny store, so a replace() back to this page re-renders it without the
// parameter, as the router does.
const searchListeners = new Set<() => void>();
export function setSearch(query: string) {
  h.search = new URLSearchParams(query);
  searchListeners.forEach((l) => l());
}
export const replace = vi.fn((url: string) => {
  if (url.startsWith('/sessions/')) setSearch(url.split('?')[1] ?? '');
});
export const push = vi.fn();
export const cancel = { mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null };
/** The zone each slot request was asked in (the cancel dialog's Suggest a new time). */
export const slotZones: string[] = [];
/** Every missed reason sent, in order, and how the hook is answering. */
export const reasons: { reason: string; note: string }[] = [];
export const reasonHook: { isPending: boolean; failed: 'retry' | 'closed' | null } = {
  isPending: false,
  failed: null,
};

/** The `vi.mock` factories, one per mocked module. */
export const mocks = {
  navigation: async () => {
    const { useSyncExternalStore } = await import('react');
    const subscribe = (l: () => void) => {
      searchListeners.add(l);
      return () => void searchListeners.delete(l);
    };
    return {
      usePathname: () => '/sessions/b1',
      useRouter: () => ({ replace, push }),
      useSearchParams: () =>
        useSyncExternalStore(
          subscribe,
          () => h.search,
          () => h.search,
        ),
    };
  },
  viewer: () => ({ useViewer: () => h.viewer }),
  sessionRoom: () => ({ useSessionRoom: () => h.room }),
  sessionAnswers: () => ({ useBookingAnswers: () => h.answers }),
  bookingActions: () => ({ useBookingAction: () => cancel }),
  booking: (orig: Record<string, unknown>) => ({
    ...orig,
    useSessionTypes: (mentorId: string | null) => ({
      data: mentorId && !h.typesLoading ? h.types : null,
      isLoading: !!mentorId && h.typesLoading,
      error: null,
      retry: vi.fn(),
      refreshing: false,
      updatedAt: 1,
    }),
    useSlots: (_mentor: string | null, _type: string | null, zone: string) => {
      slotZones.push(zone);
      return { data: h.slots, isLoading: false, error: null, retry: vi.fn() };
    },
  }),
  moveSession: () => ({
    useMoveSession: () => ({
      ...moveHook,
      move: async (req: MoveRequest, cb: MoveCallbacks) => {
        moveHook.calls.push({ req, cb });
      },
    }),
  }),
  reviewableSessions: () => ({ useMyReviewableSessions: () => h.reviewables }),
  ...reviewAndRebookMocks,
  missedReason: () => ({
    useSendMissedReason: () => ({
      send: (reason: string, note: string) => reasons.push({ reason, note }),
      ...reasonHook,
    }),
  }),
  intakeFiles: () => ({
    useIntakeFile: () => ({ url: 'blob:stub', isLoading: false, error: null, retry: vi.fn() }),
    canPreview: () => true,
  }),
};

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
  bookingCounts: { pending: 0, upcoming: 1 },
};

export const MENTEE: Extract<Viewer, { kind: 'member' }> = {
  ...MEMBER,
  isMentee: true,
  isApprovedMentor: false,
  isMentor: false,
};

// A 30-minute call at 6:00 pm Lagos (17:00 UTC); the window is 16:55–17:15.
export const START = '2026-10-04T17:00:00Z';
export const at = (hhmmss: string) => new Date(`2026-10-04T${hhmmss}Z`);

export function sessionRoom(
  over: Partial<SessionRoom['booking']> = {},
  me = {},
  provider: SessionRoom['provider'] = 'daily',
): SessionRoom {
  return {
    booking: sampleBookingFor({
      side: 'mentor',
      other: sampleParty({ id: 'amara', name: 'Amara Okafor', firstName: 'Amara' }),
      startsAt: START,
      endsAt: '2026-10-04T17:30:00Z',
      durationMin: 30,
      joinOpensAt: '2026-10-04T16:55:00Z',
      joinClosesAt: '2026-10-04T17:15:00Z',
      doorClosesAt: '2026-10-04T17:30:00Z',
      ...over,
    }),
    me: sampleParty({ id: 'me', name: 'Gbenga Ogundipe', firstName: 'Gbenga', ...me }),
    typeName: '1:1 call',
    provider,
    missedReasonSent: false,
  };
}

export const remote = <T,>(data: T | null, over: Partial<Remote<T>> = {}): Remote<T> => ({
  data,
  isLoading: false,
  error: null,
  retry: vi.fn(),
  ...over,
});

export const answer = (text: string): BookingAnswer => ({
  questionId: text,
  question: 'What would you like to talk about?',
  kind: 'free_text',
  retired: false,
  answered: true,
  required: null,
  text,
  file: null,
});

/** The per-test reset and clock: call once at the top of each test file. */
export function setupSessionJoinHarness() {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    h.search = new URLSearchParams();
    h.phone = false;
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      matches: h.phone,
      media: q,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    h.viewer = MEMBER;
    h.room = remote(sessionRoom());
    h.answers = remote<BookingAnswer[]>([]);
    resetReviewAndRebook();
    reasons.length = 0;
    reasonHook.isPending = false;
    reasonHook.failed = null;
    slotZones.length = 0;
    h.types = [];
    h.typesLoading = false;
    h.slots = [];
    moveHook.calls.length = 0;
    moveHook.isPending = false;
    moveHook.error = null;
    h.reviewables = remote([{ id: 'b1', startsAt: START, typeName: '1:1 call' }]);
    replace.mockClear();
    push.mockClear();
    cancel.mutate.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
}
