import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const get = vi.fn();
vi.mock('./http', () => ({ api: { GET: (...a: unknown[]) => get(...a) } }));
vi.mock('./session', () => ({
  useSession: () => ({ status: 'absent' }),
  sessionKey: () => 'guest',
}));

const { FREE_SOON, useMentorsFreeSoon } = await import('./freeSoon');

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const row = (n: number) => ({
  id: `m${n}`,
  slug: `mentor-${n}`,
  first_name: `Mentor${n}`,
  last_name: 'Okafor',
  cover_art: 'none',
  degree: 'MSc',
  study_course: null,
  institution: 'University of Toronto',
  taking_bookings: true,
  completed_sessions: 4,
  review_count: 0,
  session_value: null,
  next_available_state: 'open',
  next_available_at: '2026-10-23T09:00:00Z',
  joined_at: '2026-09-01T12:00:00Z',
});

describe('useMentorsFreeSoon', () => {
  beforeEach(() => get.mockReset());

  it('asks for four mentors free in the next 7 days (backend #521)', async () => {
    get.mockResolvedValueOnce({
      data: { data: [1, 2, 3, 4].map(row), next_cursor: null, total: 4 },
      response: { status: 200 },
    });
    const { result } = renderHook(() => useMentorsFreeSoon(true), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(4));
    expect(FREE_SOON).toEqual({ days: 7, shown: 4 });
    expect(get).toHaveBeenCalledWith(
      '/api/v1/mentors',
      expect.objectContaining({
        params: { query: { available_within_days: 7, limit: 4 } },
      }),
    );
  });

  it('does nothing until asked', () => {
    const { result } = renderHook(() => useMentorsFreeSoon(false), { wrapper });
    expect(get).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it('a failure is an error the page can fall back from', async () => {
    get.mockResolvedValueOnce({ data: undefined, error: {}, response: { status: 500 } });
    const { result } = renderHook(() => useMentorsFreeSoon(true), { wrapper });
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.data).toBeNull();
  });
});
