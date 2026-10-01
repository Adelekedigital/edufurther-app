import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { keys } from './keys';
import { useQuickEditSessionType } from './sessionTypeQuick';

const PATCH = vi.fn();
vi.mock('./http', () => ({ api: { PATCH: (...a: unknown[]) => PATCH(...a) } }));

function setup() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const spy = vi.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, spy, ...renderHook(() => useQuickEditSessionType(), { wrapper }) };
}
const ok = () => ({ data: {}, error: undefined, response: new Response(null, { status: 200 }) });

beforeEach(() => {
  PATCH.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe('useQuickEditSessionType', () => {
  it('sends only what changed, then refreshes what mentees see (Session types’ row-write bundle)', async () => {
    PATCH.mockResolvedValue(ok());
    const { result, spy } = setup();
    await act(() => result.current.mutateAsync({ id: 'st1', durationMin: 45 }));
    expect(PATCH).toHaveBeenCalledWith('/api/v1/me/session-types/{session_type_id}', {
      params: { path: { session_type_id: 'st1' } },
      body: { duration_minutes: 45 },
    });
    // Session types' row-write bundle refetches once no row write is in flight.
    await waitFor(() =>
      expect(spy.mock.calls.map((c) => c[0]?.queryKey)).toEqual([
        keys.sessionTypes.all,
        keys.mentors.all,
        ['booking'],
      ]),
    );
  });

  it('visibility alone sends is_active', async () => {
    PATCH.mockResolvedValue(ok());
    const { result } = setup();
    await act(() => result.current.mutateAsync({ id: 'st1', live: false }));
    expect(PATCH.mock.calls[0]![1].body).toEqual({ is_active: false });
  });

  it('refuses a length the platform doesn’t offer, without a request', async () => {
    const { result } = setup();
    await act(async () => {
      await expect(
        result.current.mutateAsync({ id: 'st1', durationMin: 20 }),
      ).rejects.toMatchObject({
        copy: 'That didn’t save. Try again.',
      });
    });
    expect(PATCH).not.toHaveBeenCalled();
  });

  it('a refusal reads as our copy, never the server’s detail', async () => {
    PATCH.mockResolvedValue({
      data: undefined,
      error: { detail: 'duration_minutes: bad' },
      response: new Response(null, { status: 422 }),
    });
    const { result } = setup();
    act(() => result.current.mutate({ id: 'st1', durationMin: 60 }));
    await waitFor(() => expect(result.current.error?.copy).toBe('That didn’t save. Try again.'));
  });

  it('offline says so', async () => {
    PATCH.mockRejectedValue(new TypeError('Failed to fetch'));
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { result } = setup();
    act(() => result.current.mutate({ id: 'st1', live: true }));
    await waitFor(() => expect(result.current.error?.copy).toMatch(/You’re offline/));
    online.mockRestore();
  });

  it('the owner’s list shows the save at once (review of PR 119)', async () => {
    PATCH.mockResolvedValue(ok());
    const { qc, result } = setup();
    const key = ['sessionTypes', 'own', 'u1'];
    qc.setQueryData(key, [
      { id: 'st1', durationMin: 60, isLive: true },
      { id: 'st2', durationMin: 30, isLive: true },
    ]);
    await act(() => result.current.mutateAsync({ id: 'st1', durationMin: 45, live: false }));
    expect(qc.getQueryData(key)).toEqual([
      { id: 'st1', durationMin: 45, isLive: false },
      { id: 'st2', durationMin: 30, isLive: true },
    ]);
  });
});
