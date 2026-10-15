import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useMyReviewQuote } from './myReviews';

const GET = vi.fn();
vi.mock('./http', () => ({ api: { GET: (...args: unknown[]) => GET(...args) } }));

const review = (over: Record<string, unknown> = {}) => ({
  id: 'r1',
  created_at: '2026-09-01T00:00:00Z',
  public_review: 'Clear and practical, I left knowing what to do next.',
  session_id: 's1',
  reviewed_for: 'm1',
  session_value: 5,
  withdrawn: false,
  author_first_name: 'Ada',
  author_last_initial: 'O',
  author_institution: 'University of Lagos',
  author_deleted: false,
  session_type: { id: 'st1', name: 'Visa and interview' },
  report: null,
  ...over,
});

const res = (rows: unknown[]) => ({
  data: { data: rows, next_cursor: null },
  error: undefined,
  response: new Response(null, { status: 200 }),
});
const errRes = (status: number) => ({
  data: undefined,
  error: { title: 'nope' },
  response: new Response(null, { status }),
});

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => GET.mockReset());

describe('useMyReviewQuote', () => {
  it('takes the newest showable review, skipping a withdrawn newer one', async () => {
    GET.mockResolvedValue(
      res([
        review({ withdrawn: true, public_review: 'Withdrawn and hidden.' }),
        review({ public_review: 'The one that should show.' }),
      ]),
    );
    const { result } = renderHook(() => useMyReviewQuote('u1'), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(GET.mock.calls[0]![1].params.query).toMatchObject({ limit: 10 });
    expect(result.current.data).toEqual({
      quote: 'The one that should show.',
      by: 'Ada O. · Visa and interview',
    });
  });

  it('attributes a deleted author as "Deleted user" with no offering suffix', async () => {
    GET.mockResolvedValue(
      res([
        review({
          author_deleted: true,
          author_first_name: null,
          author_last_initial: null,
          session_type: null,
          public_review: 'Great help on my essays.',
        }),
      ]),
    );
    const { result } = renderHook(() => useMyReviewQuote('u1'), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data!.by).toBe('Deleted user');
  });

  it('omits the offering when the review records none', async () => {
    GET.mockResolvedValue(res([review({ session_type: null })]));
    const { result } = renderHook(() => useMyReviewQuote('u1'), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data!.by).toBe('Ada O.');
  });

  it('returns null, not an error, when every review is withdrawn', async () => {
    GET.mockResolvedValue(res([review({ withdrawn: true }), review({ withdrawn: true })]));
    const { result } = renderHook(() => useMyReviewQuote('u1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('surfaces a fetch failure as an error, never a throw', async () => {
    GET.mockResolvedValue(errRes(404));
    const { result } = renderHook(() => useMyReviewQuote('u1'), { wrapper });
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.data).toBeNull();
  });
});
