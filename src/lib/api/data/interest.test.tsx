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
    const { result } = renderHook(() => useInterest(true), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data).toEqual({ available: true, features: ['payments'] });
  });

  /** An account that has asked for nothing gets 200 and an empty list. */
  it('is available with nothing registered', async () => {
    get.mockResolvedValue({ data: { data: [], next_cursor: null }, response: { status: 200, ok: true } });
    const { result } = renderHook(() => useInterest(true), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data).toEqual({ available: true, features: [] });
  });

  /** Production today: the endpoint is not built, so nothing is offered. */
  it('reports an unbuilt endpoint as unavailable rather than an error', async () => {
    get.mockResolvedValue({ data: { detail: 'Not Found' }, response: { status: 404, ok: false } });
    const { result } = renderHook(() => useInterest(true), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data).toEqual({ available: false, features: [] });
    expect(result.current.error).toBeNull();
  });

  /**
   * A probe that runs before the token is attached sees 401 both before and
   * after the endpoint merges, so "not 404" would offer a dead button.
   */
  it('does not treat a 401 as the endpoint existing', async () => {
    get.mockResolvedValue({ data: undefined, response: { status: 401, ok: false } });
    const { result } = renderHook(() => useInterest(true), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data?.available).toBe(false);
  });

  it('does not ask when the caller cannot use it', () => {
    renderHook(() => useInterest(false), { wrapper });
    expect(get).not.toHaveBeenCalled();
  });
});

describe('useRegisterInterest', () => {
  it('sends the slug', async () => {
    post.mockResolvedValue({ response: { ok: true, status: 204 } });
    const { result } = renderHook(() => useRegisterInterest(), { wrapper });
    await result.current.register('payments');
    expect(post).toHaveBeenCalledWith('/api/v1/me/interest', { body: { feature: 'payments' } });
  });

  /** Feature-agnostic: Explore's cut button reuses this unchanged. */
  it('takes any slug, with no integrations vocabulary of its own', async () => {
    post.mockResolvedValue({ response: { ok: true, status: 204 } });
    const { result } = renderHook(() => useRegisterInterest(), { wrapper });
    await result.current.register('new_mentors');
    expect(post).toHaveBeenCalledWith('/api/v1/me/interest', { body: { feature: 'new_mentors' } });
  });

  it('gives our words for a refusal', async () => {
    post.mockResolvedValue({ response: { ok: false, status: 422 } });
    const { result } = renderHook(() => useRegisterInterest(), { wrapper });
    await expect(result.current.register('payments')).rejects.toMatchObject({
      message: 'We couldn’t sign you up just now. Try again.',
    });
  });

  it('says so when the mentor is offline', async () => {
    post.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useRegisterInterest(), { wrapper });
    await expect(result.current.register('payments')).rejects.toMatchObject({
      message: expect.stringContaining('offline'),
    });
  });
});
