import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ApiError } from './errors';
import { keys } from './keys';
import { useAuthoredReview, useSendReview } from './reviewWrite';

const GET = vi.fn();
const PATCH = vi.fn();
const POST = vi.fn();
vi.mock('./http', () => ({
  api: {
    GET: (...args: unknown[]) => GET(...args),
    PATCH: (...args: unknown[]) => PATCH(...args),
    POST: (...args: unknown[]) => POST(...args),
  },
}));
vi.mock('./session', () => ({
  useSession: () => ({ status: 'none' }),
  sessionKey: () => 'none',
}));

const authored = (overall: number) => ({
  data: {
    id: 'r7',
    session_id: 's1',
    reviewed_for: 'm1',
    overall_rating: overall,
    communication_rating: 'great',
    knowledge_rating: 'great',
    support_rating: 'okay',
    practicality_rating: 'great',
    valuable_rating: 4,
    nps_recommend_score: 9,
    public_review: 'Practical, direct feedback on my SOP draft.',
    created_at: '2026-09-29T11:58:00Z',
    updated_at: '2026-09-29T11:58:00Z',
    editable_until: new Date(Date.now() + 5 * 60_000).toISOString(),
    private_review: null,
  },
  error: undefined,
  response: new Response(null, { status: 200 }),
});

let qc: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  GET.mockReset();
  PATCH.mockReset();
  POST.mockReset();
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

// Global state is put back even when an assertion fails (review r3 of #59).
afterEach(() => {
  onlineManager.setOnline(true);
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/** Offline as React Query sees it (networkMode) and as normaliseError reads it. */
function goOffline() {
  onlineManager.setOnline(false);
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
}

describe('useAuthoredReview (review r2 of #59)', () => {
  it('re-enabling (Edit opened again) refetches the cached copy; fetchedAt moves', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    GET.mockResolvedValueOnce(authored(4)).mockResolvedValueOnce(authored(2));
    const { result, rerender } = renderHook(
      ({ on }: { on: boolean }) => useAuthoredReview('r7', on),
      { wrapper, initialProps: { on: true } },
    );
    await waitFor(() => expect(result.current.data?.answers.overall).toBe(4));
    const first = result.current.fetchedAt;
    vi.setSystemTime(first + 5_000);
    rerender({ on: false });
    rerender({ on: true });
    await waitFor(() => expect(result.current.data?.answers.overall).toBe(2));
    expect(GET).toHaveBeenCalledTimes(2);
    expect(result.current.fetchedAt).toBeGreaterThan(first);
  });

  it('offline: fails at once (error + failedAt), rather than pausing forever', async () => {
    goOffline();
    GET.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useAuthoredReview('r7', true), { wrapper });
    await waitFor(() => expect(result.current.error?.kind).toBe('offline'));
    expect(result.current.failedAt).toBeGreaterThan(0);
  });

  it('back online, "Try again" loads it: fetchedAt passes failedAt', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    goOffline();
    GET.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useAuthoredReview('r7', true), { wrapper });
    await waitFor(() => expect(result.current.error?.kind).toBe('offline'));
    const failedAt = result.current.failedAt;
    vi.restoreAllMocks();
    onlineManager.setOnline(true);
    vi.setSystemTime(failedAt + 5_000);
    GET.mockResolvedValue(authored(3));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.data?.answers.overall).toBe(3));
    expect(result.current.fetchedAt).toBeGreaterThan(failedAt);
  });
});

describe('useSendReview: every send refreshes the viewer’s review (review of #59)', () => {
  const edit = {
    mode: 'edit' as const,
    mentorId: 'm1',
    reviewId: 'r7',
    before: { overall: 4 },
    answers: {
      overall: 2,
      text: 'Practical, direct feedback on my SOP draft.',
      communication: 'great' as const,
      knowledge: 'great' as const,
      support: 'okay' as const,
      practicality: 'great' as const,
      value: 4,
      recommend: 9,
      platformNote: '',
    },
  };

  it('after a save: invalidates my review and the author’s copy', async () => {
    PATCH.mockResolvedValue(authored(2));
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useSendReview(), { wrapper });
    act(() => result.current.send(edit));
    await waitFor(() => expect(result.current.result).not.toBeNull());
    const keysHit = spy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    expect(keysHit).toContain(JSON.stringify(keys.mentors.myReviewFor('m1')));
    expect(keysHit).toContain(JSON.stringify(keys.reviews.authoredAll));
  });

  it('after a 409 (the window shut): still refreshes, and says why', async () => {
    PATCH.mockResolvedValue({
      data: undefined,
      error: undefined,
      response: new Response(null, { status: 409 }),
    });
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useSendReview(), { wrapper });
    act(() => result.current.send(edit));
    await waitFor(() => expect(result.current.error?.kind).toBe('editClosed'));
    const keysHit = spy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    expect(keysHit).toContain(JSON.stringify(keys.mentors.myReviewFor('m1')));
    expect(ApiError).toBeDefined();
  });
});

describe('useSendReview offline (review r3 of #59)', () => {
  const answers = {
    overall: 5,
    text: 'Practical, direct feedback on my SOP draft.',
    communication: 'great' as const,
    knowledge: 'great' as const,
    support: 'great' as const,
    practicality: 'great' as const,
    value: 5,
    recommend: 10,
    platformNote: '',
  };

  it('a new review fails at once with the offline copy; nothing is left to post later', async () => {
    goOffline();
    POST.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useSendReview(), { wrapper });
    act(() => result.current.send({ mode: 'new', mentorId: 'm1', sessionId: 's1', answers }));
    await waitFor(() => expect(result.current.error?.kind).toBe('offline'));
    expect(result.current.error?.message).toMatch(/offline/);
    expect(POST).toHaveBeenCalledTimes(1);
    expect(
      qc
        .getMutationCache()
        .getAll()
        .some((m) => m.state.isPaused),
    ).toBe(false);
  });

  it('an edit fails at once too', async () => {
    goOffline();
    PATCH.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useSendReview(), { wrapper });
    act(() =>
      result.current.send({
        mode: 'edit',
        mentorId: 'm1',
        reviewId: 'r7',
        before: { overall: 4 },
        answers,
      }),
    );
    await waitFor(() => expect(result.current.error?.kind).toBe('offline'));
    expect(PATCH).toHaveBeenCalledTimes(1);
  });
});
