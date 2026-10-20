import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useInterest, useRegisterInterest } from './interest';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('./http', () => ({ api: { GET: get, POST: post } }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  get.mockReset();
  post.mockReset();
});

describe('useInterest', () => {
  it('reports the endpoint as available and lists what was asked', async () => {
    get.mockResolvedValue({
      data: { data: [{ feature: 'payments', registered_at: 'x' }], next_cursor: null },
      response: { status: 200, ok: true },
    });
    const { result } = renderHook(() => useInterest('m1'), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data).toEqual({ available: true, features: ['payments'] });
  });

  /** An account that has asked for nothing gets 200 and an empty list. */
  it('is available with nothing registered', async () => {
    get.mockResolvedValue({ data: { data: [], next_cursor: null }, response: { status: 200, ok: true } });
    const { result } = renderHook(() => useInterest('m1'), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data).toEqual({ available: true, features: [] });
  });

  /** Production today: the endpoint is not built, so nothing is offered. */
  it('reports an unbuilt endpoint as unavailable rather than an error', async () => {
    get.mockResolvedValue({ data: { detail: 'Not Found' }, response: { status: 404, ok: false } });
    const { result } = renderHook(() => useInterest('m1'), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data).toEqual({ available: false, features: [] });
    expect(result.current.error).toBeNull();
  });

  /**
   * A 5xx is a failure, not an absence. Resolving it as "unbuilt" would hide
   * the control for the whole staleTime with no error and no retry.
   */
  it.each([500, 502, 503])('surfaces a %s as an error rather than an absence', async (status) => {
    get.mockResolvedValue({ data: undefined, error: undefined, response: { status, ok: false } });
    const { result } = renderHook(() => useInterest('m1'), { wrapper });
    // The hook sets `retry: retryOnce` explicitly, which beats the wrapper's
    // `retry: false` — so a 5xx is attempted twice before it settles.
    await waitFor(() => expect(result.current.error).not.toBeNull(), { timeout: 5000 });
    expect(result.current.data).toBeNull();
    expect(result.current.error?.status).toBe(status);
  });

  /**
   * A probe that runs before the token is attached sees 401 both before and
   * after the endpoint merges, so "not 404" would offer a dead button.
   */
  it('does not treat a 401 as the endpoint existing', async () => {
    get.mockResolvedValue({ data: undefined, response: { status: 401, ok: false } });
    const { result } = renderHook(() => useInterest('m1'), { wrapper });
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.data?.available).not.toBe(true);
  });

  it('does not ask without a user', () => {
    renderHook(() => useInterest(null), { wrapper });
    expect(get).not.toHaveBeenCalled();
  });
});

describe('useRegisterInterest', () => {
  it('sends the slug', async () => {
    post.mockResolvedValue({ response: { ok: true, status: 204 } });
    const { result } = renderHook(() => useRegisterInterest('m1'), { wrapper });
    await result.current.register('payments');
    expect(post).toHaveBeenCalledWith('/api/v1/me/interest', { body: { feature: 'payments' } });
  });

  /** Feature-agnostic: Explore's cut button reuses this unchanged. */
  it('takes any slug, with no integrations vocabulary of its own', async () => {
    post.mockResolvedValue({ response: { ok: true, status: 204 } });
    const { result } = renderHook(() => useRegisterInterest('m1'), { wrapper });
    await result.current.register('new_mentors');
    expect(post).toHaveBeenCalledWith('/api/v1/me/interest', { body: { feature: 'new_mentors' } });
  });

  /**
   * `message` alone proves nothing: interestError overwrites it for every
   * non-offline failure, so the assertion would pass even if the status were
   * thrown away. The kind and status are what show it was classified.
   */
  it('classifies a refusal rather than losing it', async () => {
    post.mockResolvedValue({ response: { ok: false, status: 422 }, error: undefined });
    const { result } = renderHook(() => useRegisterInterest('m1'), { wrapper });
    await expect(result.current.register('payments')).rejects.toMatchObject({
      kind: 'validation',
      status: 422,
      message: 'We couldn’t sign you up just now. Try again.',
    });
  });

  it('keeps the status of a rate limit', async () => {
    post.mockResolvedValue({ response: { ok: false, status: 429 }, error: undefined });
    const { result } = renderHook(() => useRegisterInterest('m1'), { wrapper });
    await expect(result.current.register('payments')).rejects.toMatchObject({ status: 429 });
  });

  it('says so when the mentor is offline', async () => {
    post.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useRegisterInterest('m1'), { wrapper });
    await expect(result.current.register('payments')).rejects.toMatchObject({
      message: expect.stringContaining('offline'),
    });
  });
});
