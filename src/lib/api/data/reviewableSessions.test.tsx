import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { toReviewableSession, useReviewableSessions } from './reviewableSessions';

const GET = vi.fn();
vi.mock('./http', () => ({ api: { GET: (...args: unknown[]) => GET(...args) } }));
vi.mock('./session', () => ({
  useSession: () => ({ status: 'present', userId: 'u1' }),
  sessionKey: () => 'u1',
}));

const row = (id: string, startsAt: string, typeName: string | null = 'SOP draft review') => ({
  session_id: id,
  mentor_id: 'm1',
  starts_at: startsAt,
  session_type_id: 'st1',
  session_type_name: typeName,
});
const page = (rows: unknown[]) => ({
  data: { data: rows, next_cursor: null },
  error: undefined,
  response: new Response(null, { status: 200 }),
});

function wrapper({ children }: { children: ReactNode }) {
  // `retryDelay: 0` only: the hook's own `retryOnce` decides whether to retry,
  // and a 500 takes that retry — without this the backoff outlives the test.
  const qc = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => GET.mockReset());

describe('toReviewableSession', () => {
  it('keeps what a picker needs to label the row', () => {
    expect(toReviewableSession(row('s1', '2026-09-19T15:00:00Z'))).toEqual({
      id: 's1',
      startsAt: '2026-09-19T15:00:00Z',
      typeName: 'SOP draft review',
    });
  });

  it('a session from before offerings existed has no type name, not an empty one', () => {
    expect(toReviewableSession(row('s1', '2026-09-19T15:00:00Z', null)).typeName).toBeNull();
  });
});

describe('useReviewableSessions', () => {
  it('asks for the whole list, newest first', async () => {
    GET.mockResolvedValue(
      page([row('old', '2026-08-01T15:00:00Z'), row('new', '2026-09-19T15:00:00Z')]),
    );
    const { result } = renderHook(() => useReviewableSessions(true), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(2));
    // No mentor_id: this screen asks across every mentor, unlike the profile tab.
    expect(GET.mock.calls[0]![0]).toBe('/api/v1/me/reviewable-sessions');
    expect(GET.mock.calls[0]![1]).not.toHaveProperty('params');
    expect(result.current.data!.map((s) => s.id)).toEqual(['new', 'old']);
  });

  it('nothing to review is an empty list, not an error', async () => {
    GET.mockResolvedValue(page([]));
    const { result } = renderHook(() => useReviewableSessions(true), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('fetches nothing until the tab that needs it is on show', () => {
    const { result } = renderHook(() => useReviewableSessions(false), { wrapper });
    // Loading, not empty: an inactive read must never read as "nothing here".
    expect(result.current.isLoading).toBe(true);
    expect(GET).not.toHaveBeenCalled();
  });

  it('a failure is normalised, and the server never speaks through it', async () => {
    // The real shape: openapi-fetch resolves with `error`, it never rejects.
    GET.mockResolvedValue({
      data: undefined,
      error: {
        type: 'about:blank',
        title: 'Internal Server Error',
        status: 500,
        detail: 'relation sessions is locked by pid 8812',
      },
      response: new Response(null, { status: 500 }),
    });
    const { result } = renderHook(() => useReviewableSessions(true), { wrapper });
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error!.kind).toBe('server');
    // RFC 9457 `detail` is not safe to show; the copy is ours, chosen by status.
    expect(result.current.error!.message).toBe('Something went wrong on our side.');
    expect(JSON.stringify(result.current.error)).not.toMatch(/pid 8812/);
  });
});
