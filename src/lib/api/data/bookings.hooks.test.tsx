import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { components } from '@/lib/api/generated/schema';
import type { BookingStatus } from '@/types/booking';
import { toBooking, useBookingHistory, usePendingBookings, useUpcomingBookings } from './bookings';

type SessionRead = components['schemas']['SessionRead'];

const get = vi.fn();
vi.mock('./http', () => ({
  api: { GET: (...a: unknown[]) => get(...a) },
}));
vi.mock('./session', () => ({
  useSession: () => ({ status: 'present', userId: 'me' }),
  sessionKey: () => 'me',
}));

const NOW = new Date('2026-10-04T17:20:00Z');
const party = (id: string, joinedAt: string | null = null) => ({
  id,
  deleted: false,
  first_name: id === 'me' ? 'Gbenga' : 'Amara',
  last_name: 'Okafor',
  avatar_url: null,
  cover_art: 'none' as const,
  avatar_focus: null,
  timezone: 'Africa/Lagos',
  joined_at: joinedAt,
  attendance_status: 'pending' as const,
  degree: null,
  institution: null,
});
// A 30-minute call at 17:00; arrivals close 17:15, the room 17:30.
const row = (over: Partial<SessionRead> = {}, myJoin: string | null = null): SessionRead => ({
  id: 's1',
  mentor_id: 'me',
  mentee_id: 'them',
  mentee_attendance_sessions: 0,
  mentor: party('me', myJoin),
  mentee: party('them'),
  session_type_id: 'st1',
  session_type: { id: 'st1', name: '1:1 call' },
  status: 'confirmed',
  starts_at: '2026-10-04T17:00:00Z',
  duration_minutes: 30,
  topic: null,
  booking_message: null,
  meeting_provider: 'daily',
  meeting_url: null,
  respond_by: null,
  join_opens_at: '2026-10-04T16:55:00Z',
  join_closes_at: '2026-10-04T17:15:00Z',
  door_closes_at: '2026-10-04T17:30:00Z',
  created_at: '2026-09-20T09:00:00Z',
  mentee_attendance_rate: null,
  ...over,
});
const ok = (data: unknown) => ({ data, error: undefined, response: { ok: true, status: 200 } });
const fail = (status: number) => ({
  data: undefined,
  error: {},
  response: { ok: false, status, headers: new Headers() },
});

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
beforeEach(() => {
  get.mockReset();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => vi.useRealTimers());

describe('toBooking', () => {
  it('carries the viewer’s own first arrival', () => {
    expect(toBooking(row({}, '2026-10-04T17:01:00Z'), 'me').myJoinedAt).toBe(
      '2026-10-04T17:01:00Z',
    );
    expect(toBooking(row(), 'me').myJoinedAt).toBeNull();
  });
});

describe('useUpcomingBookings', () => {
  it('keeps a session settled mid-call while its room is open for someone who joined', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
    get.mockResolvedValueOnce(
      ok({
        data: [
          row({ id: 'joined-settled', status: 'completed' }, '2026-10-04T17:01:00Z'),
          row({ id: 'never-joined-settled', status: 'completed' }),
          row({
            id: 'ended',
            status: 'completed',
            starts_at: '2026-10-04T09:00:00Z',
            door_closes_at: '2026-10-04T09:30:00Z',
          }),
          row({ id: 'next', starts_at: '2026-10-04T19:00:00Z' }),
        ],
        next_cursor: null,
      }),
    );
    const { result } = renderHook(() => useUpcomingBookings('me', 'Africa/Lagos'), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data!.map((b) => b.id)).toEqual(['joined-settled', 'next']);
    expect(get.mock.calls[0]![1].params.query.status).toEqual([
      'confirmed',
      'completed',
      'no_show',
    ]);
  });

  it('drops a confirmed session past its scheduled end, keeps one still running', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW); // 17:20 — the 17:00–17:30 session is still running
    get.mockResolvedValueOnce(
      ok({
        data: [
          // Confirmed but ended at 09:30 — settling into its outcome; it vanishes.
          row({ id: 'ended-confirmed', starts_at: '2026-10-04T09:00:00Z' }),
          // Confirmed and still inside its scheduled time (17:00–17:30) — kept.
          row({ id: 'running' }),
          // Confirmed and upcoming — kept.
          row({ id: 'later', starts_at: '2026-10-04T19:00:00Z' }),
        ],
        next_cursor: null,
      }),
    );
    const { result } = renderHook(() => useUpcomingBookings('me', 'Africa/Lagos'), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data!.map((b) => b.id)).toEqual(['running', 'later']);
  });

  it('forwards `as` to the sessions query so one side is fetched server-side', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
    get.mockResolvedValue(ok({ data: [], next_cursor: null }));
    renderHook(() => useUpcomingBookings('me', 'Africa/Lagos', true, 'mentor'), { wrapper });
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(get.mock.calls[0]![1].params.query.as).toBe('mentor');
  });
});

describe('an expired request belongs in History (owner, 2026-10-13)', () => {
  // Judged against NOW: `respond_by` in the past is lapsed, whatever the API
  // still calls the row.
  const req = (id: string, respondBy: string, startsAt: string) =>
    row({ id, status: 'pending_mentor_approval', respond_by: respondBy, starts_at: startsAt });
  const lapsed = req('lapsed', '2026-10-04T12:00:00Z', '2026-10-06T10:00:00Z');
  const waiting = req('waiting', '2026-10-05T12:00:00Z', '2026-10-07T10:00:00Z');
  const done = row({ id: 'done', status: 'completed', starts_at: '2026-10-01T10:00:00Z' });
  const calledOff = row({
    id: 'called-off',
    status: 'cancelled',
    starts_at: '2026-09-28T10:00:00Z',
  });
  const settled = (i: number) =>
    row({
      id: `h${i}`,
      status: 'completed',
      starts_at: new Date(Date.parse('2026-10-01T10:00:00Z') - i * 3_600_000).toISOString(),
    });
  const fullPage = (from: number) => Array.from({ length: 20 }, (_, i) => settled(from + i));

  /**
   * One fake endpoint for both reads, keyed on the statuses asked for rather
   * than on call order: the two queries fire together and which lands first is
   * React Query's business. A history cursor is the index of the next page.
   */
  const serve = ({
    pending = [],
    pages = [[]],
  }: {
    pending?: SessionRead[];
    pages?: SessionRead[][];
  }) =>
    get.mockImplementation((_path: string, init: { params: { query: Query } }) => {
      const q = init.params.query;
      if (q.status.includes('pending_mentor_approval'))
        return Promise.resolve(ok({ data: pending, next_cursor: null }));
      const i = q.cursor ? Number(q.cursor) : 0;
      const last = i >= pages.length - 1;
      return Promise.resolve(
        ok({ data: pages[i] ?? [], next_cursor: last ? null : String(i + 1) }),
      );
    });
  type Query = { status: string[]; cursor?: string; limit: number };
  const queries = () =>
    get.mock.calls.map(([, init]) => (init as { params: { query: Query } }).params.query);
  const openRequests = () => queries().filter((q) => q.status.includes('pending_mentor_approval'));
  const settledOnly = () => queries().filter((q) => !q.status.includes('pending_mentor_approval'));

  // Both tabs at once, which the screen never does — it is what proves they
  // partition one snapshot rather than each deciding for themselves.
  const useTabs = (filters: BookingStatus[] = []) => ({
    pending: usePendingBookings('me'),
    history: useBookingHistory('me', filters),
  });
  const ids = (rows: { id: string }[]) => rows.map((b) => b.id);

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });

  it('files a request past its deadline under History, in the server’s order', async () => {
    serve({ pending: [lapsed, waiting], pages: [[done]] });
    const { result } = renderHook(() => useTabs(), { wrapper });
    await waitFor(() => expect(result.current.history.isLoading).toBe(false));
    // Newest first, so the rescued row sorts above the completed session
    // rather than landing at whichever end the merge left it.
    expect(ids(result.current.history.bookings)).toEqual(['lapsed', 'done']);
    expect(ids(result.current.pending.data!)).not.toContain('lapsed');
  });

  it('leaves a request still inside its deadline in Pending alone', async () => {
    serve({ pending: [lapsed, waiting], pages: [[done]] });
    const { result } = renderHook(() => useTabs(), { wrapper });
    await waitFor(() => expect(result.current.history.isLoading).toBe(false));
    expect(ids(result.current.pending.data!)).toEqual(['waiting']);
    expect(ids(result.current.history.bookings)).not.toContain('waiting');
  });

  it('asks once for the open requests, however many tabs want them', async () => {
    serve({ pending: [lapsed, waiting], pages: [[done]] });
    const { result } = renderHook(() => useTabs(), { wrapper });
    await waitFor(() => expect(result.current.history.isLoading).toBe(false));
    expect(openRequests()).toHaveLength(1);
  });

  it('keeps them under the “Didn’t happen” filter', async () => {
    serve({ pending: [lapsed], pages: [[calledOff]] });
    const { result } = renderHook(
      () => useBookingHistory('me', ['cancelled', 'declined', 'expired', 'withdrawn']),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(ids(result.current.bookings)).toEqual(['lapsed', 'called-off']);
  });

  it('never asks for them under a filter that excludes expired', async () => {
    serve({ pending: [lapsed], pages: [[done]] });
    const { result } = renderHook(() => useBookingHistory('me', ['completed']), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(ids(result.current.bookings)).toEqual(['done']);
    expect(openRequests()).toHaveLength(0);
  });

  it('spends none of the page on them, and pages on the server’s own cursor', async () => {
    serve({ pending: [lapsed, waiting], pages: [fullPage(0), fullPage(20)] });
    const { result } = renderHook(() => useTabs(), { wrapper });
    await waitFor(() => expect(result.current.history.isLoading).toBe(false));
    // The paged query is untouched: twenty settled rows asked for, twenty
    // shown, plus the one rescued request on top.
    expect(settledOnly()[0]!.limit).toBe(20);
    expect(settledOnly()[0]!.status).not.toContain('pending_mentor_approval');
    expect(result.current.history.bookings).toHaveLength(21);
    expect(result.current.history.hasMore).toBe(true);

    act(() => result.current.history.loadMore());
    await waitFor(() => expect(result.current.history.bookings).toHaveLength(41));
    // Added once, at the top, and still there as the list grows beneath it.
    expect(result.current.history.bookings.filter((b) => b.id === 'lapsed')).toHaveLength(1);
    expect(result.current.history.bookings[0]!.id).toBe('lapsed');
    // The end of the list is still the server's answer, not a short page.
    expect(result.current.history.hasMore).toBe(false);
  });

  it('says so when the rescue read fails, rather than quietly dropping rows', async () => {
    get.mockImplementation((_path: string, init: { params: { query: Query } }) =>
      Promise.resolve(
        init.params.query.status.includes('pending_mentor_approval')
          ? fail(404)
          : ok({ data: [done], next_cursor: null }),
      ),
    );
    const { result } = renderHook(() => useBookingHistory('me', []), { wrapper });
    await waitFor(() => expect(result.current.error).not.toBeNull());
  });
});
