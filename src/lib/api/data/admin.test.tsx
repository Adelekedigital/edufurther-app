import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { toMentorSummary, useAdminSummary } from './admin';
import { ApiError } from './errors';

const GET = vi.fn();
vi.mock('./http', () => ({ api: { GET: (...args: unknown[]) => GET(...args) } }));

const wire = {
  counts: { applications: 4, approved: 6, paused: 2, not_approved: 1 },
  applications_longest_wait_days: 7,
  approved_average_show_up: 82,
  at_risk: 1,
};

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  GET.mockReset();
});

describe('toMentorSummary', () => {
  it('maps the wire summary, nulls kept', () => {
    expect(toMentorSummary(wire)).toEqual({
      counts: { applications: 4, approved: 6, paused: 2, notApproved: 1 },
      longestWaitDays: 7,
      averageShowUp: 82,
      atRisk: 1,
    });
    expect(
      toMentorSummary({
        ...wire,
        applications_longest_wait_days: null,
        approved_average_show_up: null,
      }),
    ).toMatchObject({ longestWaitDays: null, averageShowUp: null });
  });
});

describe('useAdminSummary', () => {
  it('never asks for anyone but an admin', () => {
    const { result } = renderHook(() => useAdminSummary(null), { wrapper });
    expect(GET).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('an admin gets the mapped summary', async () => {
    GET.mockResolvedValue({ data: wire, response: new Response(null, { status: 200 }) });
    const { result } = renderHook(() => useAdminSummary('admin-1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(GET).toHaveBeenCalledWith('/api/v1/admin/mentors/summary', expect.anything());
    expect(result.current.data?.counts.applications).toBe(4);
  });

  it('a failed call is an ApiError with its status', async () => {
    GET.mockResolvedValue({ data: undefined, response: new Response(null, { status: 404 }) });
    const { result } = renderHook(() => useAdminSummary('admin-1'), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).status).toBe(404);
  });
});
