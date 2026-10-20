import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { SECURITY_COPY } from '@/lib/copy/settings';

const user = vi.fn();
vi.mock('./auth', () => ({ signedInUser: () => user() }));
const del = vi.fn();
vi.mock('./http', () => ({ api: { DELETE: (...a: unknown[]) => del(...a) } }));

const { useDeleteAccount, useLoginProvider } = await import('./account');

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useLoginProvider', () => {
  it('reads Google from the session', async () => {
    user.mockResolvedValueOnce({ loginProvider: 'google' });
    const { result } = renderHook(() => useLoginProvider('u1'), { wrapper });
    await waitFor(() => expect(result.current.provider).toBe('google'));
  });

  it('signed out or unreadable: the email code, and not cached (asked again next time)', async () => {
    const qc = new QueryClient();
    const own = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    user.mockRejectedValueOnce(new Error('network'));
    const first = renderHook(() => useLoginProvider('u1'), { wrapper: own });
    await waitFor(() => expect(first.result.current.provider).toBe('email'));
    first.unmount();
    user.mockResolvedValueOnce({ loginProvider: 'google' });
    const again = renderHook(() => useLoginProvider('u1'), { wrapper: own });
    await waitFor(() => expect(again.result.current.provider).toBe('google'));
  });

  it('no signed-in user: the email code', async () => {
    user.mockResolvedValueOnce(null);
    const { result } = renderHook(() => useLoginProvider('u1'), { wrapper });
    await waitFor(() => expect(result.current.provider).toBe('email'));
  });
});

describe('useDeleteAccount', () => {
  const run = async () => {
    const { result } = renderHook(() => useDeleteAccount(), { wrapper });
    await act(() => result.current.mutateAsync().catch(() => {}));
    await waitFor(() => expect(result.current.isPending).toBe(false));
    return result.current;
  };

  it('sends DELETE /me with the confirm word', async () => {
    del.mockResolvedValueOnce({ response: new Response(null, { status: 204 }) });
    const r = await run();
    expect(del).toHaveBeenCalledWith('/api/v1/me', { body: { confirm: 'DELETE' } });
    expect(r.isSuccess).toBe(true);
  });

  it('a 404 is the account already gone (a second request racing ours): done', async () => {
    del.mockResolvedValueOnce({ error: {}, response: new Response(null, { status: 404 }) });
    expect((await run()).isSuccess).toBe(true);
  });

  it('offline, 422 and anything else each get our words', async () => {
    del.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    expect((await run()).error?.copy).toBe(SECURITY_COPY.offline);
    onLine.mockRestore();
    del.mockResolvedValueOnce({ error: {}, response: new Response(null, { status: 422 }) });
    expect((await run()).error?.copy).toBe(SECURITY_COPY.wrongWord);
    del.mockResolvedValueOnce({ error: {}, response: new Response(null, { status: 500 }) });
    expect((await run()).error?.copy).toBe(SECURITY_COPY.failed);
  });
});
