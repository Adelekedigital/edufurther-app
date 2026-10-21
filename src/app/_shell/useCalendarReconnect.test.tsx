import { renderHook } from '@testing-library/react';
import type { CalendarConnection } from '@/lib/api/data/calendarConnection';
import { RECONNECT_COPY } from '@/lib/copy/integrations';
import type { AppError, Remote } from '@/types/mentor';
import { useCalendarReconnect } from './useCalendarReconnect';

let connection: Remote<CalendarConnection | null>;
vi.mock('@/lib/api/data/calendarConnection', () => ({
  useCalendarConnection: () => connection,
}));

const focusPageHeading = vi.fn();
vi.mock('./RouteFocusManager', () => ({ focusPageHeading: () => focusPageHeading() }));

let status: { data: { approved: boolean; listed: boolean; pausedByMentor: boolean } | null };
vi.mock('@/lib/api/data/mentorStatus', () => ({
  useMentorStatus: () => status,
}));

const connectFn = vi.fn();
const connectHook = vi.fn();
let connectState: { kind: string } = { kind: 'idle' };
let unavailable = false;
vi.mock('./useCalendarConnect', () => ({
  useCalendarConnect: (...args: unknown[]) => (
    connectHook(...args),
    {
      state: connectState,
      connect: connectFn,
      unavailable,
      dismiss: vi.fn(),
    }
  ),
}));

const remote = (data: CalendarConnection | null, over: Partial<Remote<unknown>> = {}) =>
  ({
    data,
    isLoading: false,
    error: null,
    retry: vi.fn(),
    ...over,
  }) as Remote<CalendarConnection | null>;

const conn = (over: Partial<CalendarConnection> = {}): CalendarConnection => ({
  connectedAt: '2026-10-01T09:00:00Z',
  status: 'active',
  lastSyncedAt: null,
  fault: null,
  accountEmail: 'team@edufurther.com',
  ...over,
});

const announce = vi.fn();

beforeEach(() => {
  connection = remote(conn({ status: 'error', fault: 'revoked' }));
  status = { data: { approved: true, listed: true, pausedByMentor: false } };
  connectState = { kind: 'idle' };
  unavailable = false;
  connectFn.mockReset();
  connectHook.mockReset();
  focusPageHeading.mockReset();
  announce.mockReset();
});

describe('useCalendarReconnect', () => {
  it('shows for a connection the backend marked broken', () => {
    const { result } = renderHook(() => useCalendarReconnect('m1', announce));
    expect(result.current.show).toBe(true);
  });

  /** The banner is for repair, not for setup. */
  it('stays away from a working connection', () => {
    connection = remote(conn({ status: 'active' }));
    const { result } = renderHook(() => useCalendarReconnect('m1', announce));
    expect(result.current.show).toBe(false);
  });

  it('stays away when nothing is connected', () => {
    connection = remote(null);
    const { result } = renderHook(() => useCalendarReconnect('m1', announce));
    expect(result.current.show).toBe(false);
  });

  /**
   * A blip must not nag a mentor whose calendar is fine. React Query keeps
   * `data` through a failed refetch, so an error with no data is a load
   * failure, not a broken grant.
   */
  it('stays away when the connection could not be loaded', () => {
    connection = remote(null, { error: { kind: 'server', message: 'x' } as AppError });
    const { result } = renderHook(() => useCalendarReconnect('m1', announce));
    expect(result.current.show).toBe(false);
  });

  it('stays away from someone who is not a mentor', () => {
    connection = remote(null);
    const { result } = renderHook(() => useCalendarReconnect(null, announce));
    expect(result.current.show).toBe(false);
  });

  /**
   * "Times you're busy can still be booked" is false while paused: nothing can
   * be booked at all. The rule lives here rather than in each screen, because
   * the banner is mounted twice and a per-screen guard got applied to one and
   * forgotten on the other (review of #357).
   */
  it('stays away while the mentor is paused', () => {
    status = { data: { approved: true, listed: true, pausedByMentor: true } };
    const { result } = renderHook(() => useCalendarReconnect('m1', announce));
    expect(result.current.show).toBe(false);
  });

  it('stays away while EduFurther has unlisted them', () => {
    status = { data: { approved: true, listed: false, pausedByMentor: false } };
    const { result } = renderHook(() => useCalendarReconnect('m1', announce));
    expect(result.current.show).toBe(false);
  });

  /** Unknown is not bookable: better quiet than a claim we cannot stand behind. */
  it('stays away while the booking state is unknown', () => {
    status = { data: null };
    const { result } = renderHook(() => useCalendarReconnect('m1', announce));
    expect(result.current.show).toBe(false);
  });

  it('reports the consent window as busy, with nothing failed', () => {
    connectState = { kind: 'busy' };
    const { result } = renderHook(() => useCalendarReconnect('m1', announce));
    expect(result.current.busy).toBe(true);
    expect(result.current.failure).toBeNull();
  });

  /** Every outcome ends somewhere a mentor can act on; none of them spin. */
  it.each([
    ['blocked', /blocked the pop-up/],
    ['nothingConnected', /wasn’t ticked/],
    ['offline', /offline/],
    ['failed', /couldn’t start reconnecting/],
    ['unavailable', /isn’t available right now/],
  ])('says why a %s attempt did not land', (kind, expected) => {
    connectState = { kind };
    const { result } = renderHook(() => useCalendarReconnect('m1', announce));
    expect(result.current.failure).toMatch(expected);
    // Still broken, so the banner stays put.
    expect(result.current.show).toBe(true);
  });

  /**
   * The banner's own role="alert" speaks its failures. Announcing them again
   * through the screen's live region would read every one of them twice.
   */
  it('does not announce failures itself', () => {
    connectState = { kind: 'blocked' };
    renderHook(() => useCalendarReconnect('m1', announce));
    expect(announce).not.toHaveBeenCalled();
  });

  it('stops offering where no calendar client is configured', () => {
    unavailable = true;
    const { result } = renderHook(() => useCalendarReconnect('m1', announce));
    expect(result.current.unavailable).toBe(true);
  });

  /**
   * Without this, dropping the 4th argument silently reverts the success line
   * to Integrations' "Google Calendar connected…" on a screen where the mentor
   * was reconnecting, and no test fails.
   */
  it('asks for the reconnect wording, not the first-time-setup wording', () => {
    renderHook(() => useCalendarReconnect('m1', announce));
    expect(connectHook).toHaveBeenCalledWith(
      'm1',
      connection.data,
      announce,
      RECONNECT_COPY.reconnected,
    );
  });

  it('runs the same consent the Integrations page runs', () => {
    const { result } = renderHook(() => useCalendarReconnect('m1', announce));
    result.current.reconnect();
    expect(connectFn).toHaveBeenCalled();
  });

  /**
   * The banner unmounts on repair, taking the focused Reconnect button with
   * it, and focus falls to <body>: the next Tab starts from the top of the
   * page. IntegrationsScreen already treats that as a bug and takes focus
   * back; this does the same (review of #357).
   */
  it('puts focus back on the page when the grant is repaired', () => {
    const { result, rerender } = renderHook(() => useCalendarReconnect('m1', announce));
    result.current.reconnect();
    connection = remote(conn({ status: 'active' }));
    rerender();
    expect(focusPageHeading).toHaveBeenCalled();
  });

  /** A grant repaired in another tab must not move focus under the reader. */
  it('leaves focus alone when the repair was not theirs', () => {
    const { rerender } = renderHook(() => useCalendarReconnect('m1', announce));
    connection = remote(conn({ status: 'active' }));
    rerender();
    expect(focusPageHeading).not.toHaveBeenCalled();
  });
});
