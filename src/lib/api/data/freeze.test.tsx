import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { apiError } from './errors';
import { useInReviewRefusal } from './freeze';

const IN_REVIEW = apiError(409, {
  type: '/problems/mentor-application-in-review',
  title: 'MentorApplicationInReviewError',
  fields: ['headline'],
});

function setup() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, wrapper };
}

describe('useInReviewRefusal', () => {
  it('a save refused for the review, made since the page opened: true', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(
      () => ({
        refused: useInReviewRefusal(),
        save: useMutation({ mutationFn: () => Promise.reject(IN_REVIEW) }),
      }),
      { wrapper },
    );
    expect(result.current.refused).toBe(false);
    await act(async () => {
      await result.current.save.mutateAsync().catch(() => undefined);
    });
    await waitFor(() => expect(result.current.refused).toBe(true));
  });

  it('any other failure: false', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(
      () => ({
        refused: useInReviewRefusal(),
        save: useMutation({ mutationFn: () => Promise.reject(apiError(500, {})) }),
      }),
      { wrapper },
    );
    await act(async () => {
      await result.current.save.mutateAsync().catch(() => undefined);
    });
    expect(result.current.refused).toBe(false);
  });

  it('a refusal from before the page opened (the decision may have come since): false', async () => {
    const { qc, wrapper } = setup();
    // An earlier page's refused save, still in the cache.
    await qc
      .getMutationCache()
      .build(qc, { mutationFn: () => Promise.reject(IN_REVIEW) })
      .execute(undefined)
      .catch(() => undefined);
    await new Promise((r) => setTimeout(r, 5));
    const { result } = renderHook(() => useInReviewRefusal(), { wrapper });
    expect(result.current).toBe(false);
  });
});
