/**
 * Test stubs for `useCancelMove`'s modules, shared by the Session Join and
 * Bookings harnesses and the hook's own tests: the move (each press recorded,
 * the outcome up to the test) and the mentor's session types. The real hooks
 * need a query client. Register with
 * `vi.mock('@/lib/api/data/moveSession', () => cancelMoveMocks.moveSession())`,
 * and spread `cancelMoveMocks.useSessionTypes` into the booking module's mock.
 */
import type { MoveRequest } from '@/lib/api/data/moveSession';
import type { AppError, SessionType } from '@/types/mentor';

/** The mentee's move (useMoveSession): each press recorded, the outcome up to the test. */
export const moveHook = {
  calls: [] as { req: MoveRequest; onMoved: (newId: string, confirmed: boolean) => void }[],
  isPending: false,
  error: null as AppError | null,
  reset: vi.fn(),
};

/** The mentor's session types (useSessionTypes), for the move, and each mentor asked about. */
export const sessionTypes = {
  data: [] as SessionType[],
  loading: false,
  asked: [] as (string | null)[],
};

export const cancelMoveMocks = {
  moveSession: () => ({
    useMoveSession: () => ({
      ...moveHook,
      move: (req: MoveRequest, onMoved: (newId: string, confirmed: boolean) => void) => {
        moveHook.calls.push({ req, onMoved });
      },
    }),
  }),
  useSessionTypes: (mentorId: string | null) => {
    sessionTypes.asked.push(mentorId);
    return {
      data: mentorId && !sessionTypes.loading ? sessionTypes.data : null,
      isLoading: !!mentorId && sessionTypes.loading,
      error: null,
      retry: vi.fn(),
      refreshing: false,
      updatedAt: 1,
    };
  },
};

/** The per-test reset: call from the harness's own. */
export function resetCancelMove() {
  moveHook.calls.length = 0;
  moveHook.isPending = false;
  moveHook.error = null;
  moveHook.reset.mockClear();
  sessionTypes.data = [];
  sessionTypes.loading = false;
  sessionTypes.asked.length = 0;
}
