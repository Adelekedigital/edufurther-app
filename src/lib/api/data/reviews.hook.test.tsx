import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ApiError } from './errors';
import { useMentorReviews } from './reviews';

const GET = vi.fn();
vi.mock('./http', () => ({ api: { GET: (...args: unknown[]) => GET(...args) } }));
vi.mock('./session', () => ({
  useSession: () => ({ status: 'none' }),
  sessionKey: () => 'none',
}));

const row = (id: string) => ({
  id,
  created_at: '2026-09-01T12:00:00Z',
  public_review: `Review ${id}: the full text.`,
  session_value: 5,
  author_first_name: 'Ada',
  author_last_initial: 'O',
  author_institution: 'University of Lagos',
  author_deleted: false,
  session_type: { id: 'st1', name: 'SOP draft review' },
});
const page = (ids: string[], next: string | null) => ({
  data: { data: ids.map(row), next_cursor: next },
  error: undefined,
  response: new Response(null, { status: 200 }),
});

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => GET.mockReset());

describe('useMentorReviews', () => {
  it('a guest asks for one review, gets it without its text, and never pages', async () => {
    GET.mockResolvedValue(page(['r1'], 'cursor-2'));
    const { result } = renderHook(
      () => useMentorReviews('gbenga', null, { guest: true, active: true, ready: true }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.reviews).toHaveLength(1));
    expect(GET.mock.calls[0]![1].params.query).toMatchObject({ limit: 1 });
    expect(result.current.reviews[0]!.text).toBe('');
    expect(result.current.hasMore).toBe(false);
  });

  it('a member gets five a page with the text, and pages on', async () => {
    GET.mockResolvedValue(page(['r1', 'r2'], 'cursor-2'));
    const { result } = renderHook(
      () => useMentorReviews('gbenga', 'st1', { guest: false, active: true, ready: true }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.reviews).toHaveLength(2));
    expect(GET.mock.calls[0]![1].params.query).toMatchObject({ limit: 5, session_type: 'st1' });
    expect(result.current.reviews[0]!.text).toBe('Review r1: the full text.');
    expect(result.current.hasMore).toBe(true);
  });

  it('reads as loading, not empty, while who is looking is unknown', () => {
    const { result } = renderHook(
      () => useMentorReviews('gbenga', null, { guest: false, active: true, ready: false }),
      { wrapper },
    );
    expect(result.current.isLoading).toBe(true);
    expect(GET).not.toHaveBeenCalled();
  });

  it('a stale cursor (422) on "Show more" starts again from page 1', async () => {
    GET.mockResolvedValueOnce(page(['r1'], 'stale'))
      .mockRejectedValueOnce(new ApiError(422))
      .mockResolvedValue(page(['r1'], null));
    const { result } = renderHook(
      () => useMentorReviews('gbenga', null, { guest: false, active: true, ready: true }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.hasMore).toBe(true));
    act(() => result.current.loadMore());
    // Page 1 again, with no cursor, and no stuck "Try again".
    await waitFor(() => expect(GET).toHaveBeenCalledTimes(3));
    expect(GET.mock.calls[2]![1].params.query.cursor).toBeUndefined();
    await waitFor(() => expect(result.current.loadMoreError).toBeNull());
    expect(result.current.hasMore).toBe(false);
  });
});
