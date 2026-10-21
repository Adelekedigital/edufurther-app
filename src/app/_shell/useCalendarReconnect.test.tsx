import { renderHook } from '@testing-library/react';
import type { CalendarConnection } from '@/lib/api/data/calendarConnection';
import type { AppError, Remote } from '@/types/mentor';
import { useCalendarReconnect } from './useCalendarReconnect';

let connection: Remote<CalendarConnection | null>;
vi.mock('@/lib/api/data/calendarConnection', () => ({
  useCalendarConnection: () => connection,
}));

const connectFn = vi.fn();
let connectState: { kind: string } = { kind: 'idle' };
let unavailable = false;
vi.mock('./useCalendarConnect', () => ({
  useCalendarConnect: () => ({
    state: connectState,
    connect: connectFn,
    unavailable,
    dismiss: vi.fn(),
  }),
}));

const remote = (data: CalendarConnection | null, over: Partial<Remote<unknown>> = {}) =>
  ({ data, isLoading: false, error: null, retry: vi.fn(), ...over }) as Remote<
    CalendarConnection | null
  >;

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
  connectState = { kind: 'idle' };
  unavailable = false;
  connectFn.mockReset();
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

  it('runs the same consent the Integrations page runs', () => {
    const { result } = renderHook(() => useCalendarReconnect('m1', announce));
    result.current.reconnect();
    expect(connectFn).toHaveBeenCalled();
  });
});
