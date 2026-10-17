import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const GET = vi.fn();
const PATCH = vi.fn();
vi.mock('./http', () => ({
  api: { GET: (...a: unknown[]) => GET(...a), PATCH: (...a: unknown[]) => PATCH(...a) },
}));

const { useSaveName, fetchSignInAccount } = await import('./signIn');

const res = (status: number, data?: unknown, error?: unknown) => ({
  data,
  error,
  response: { status, ok: status >= 200 && status < 300 },
});

describe('fetchSignInAccount (who just signed in)', () => {
  it('reads a never-named account from first_name null', async () => {
    GET.mockResolvedValueOnce(
      res(200, { id: 'u1', first_name: null, is_admin: false, mentor_profile: null }),
    );
    expect(await fetchSignInAccount()).toEqual({
      kind: 'member',
      id: 'u1',
      firstName: null,
      isAdmin: false,
      isMentor: false,
      mentorApproved: false,
    });
  });

  it('counts any mentor profile as a mentor, approved or not', async () => {
    GET.mockResolvedValueOnce(
      res(200, {
        id: 'u2',
        first_name: 'Gbenga',
        is_admin: false,
        mentor_profile: { approval_status: 'pending' },
      }),
    );
    expect(await fetchSignInAccount()).toMatchObject({
      firstName: 'Gbenga',
      isMentor: true,
      mentorApproved: false,
    });
  });

  it('separates no account (404 / 409) from a failure', async () => {
    GET.mockResolvedValueOnce(res(404));
    expect(await fetchSignInAccount()).toEqual({ kind: 'noAccount' });
    GET.mockResolvedValueOnce(res(409));
    expect(await fetchSignInAccount()).toEqual({ kind: 'noAccount' });
    GET.mockResolvedValueOnce(res(500));
    expect(await fetchSignInAccount()).toEqual({ kind: 'error' });
    GET.mockRejectedValueOnce(new Error('offline'));
    expect(await fetchSignInAccount()).toEqual({ kind: 'error' });
  });
});

describe('useSaveName (either shape of name input)', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
  );
  beforeEach(() => PATCH.mockReset());

  it('sends a full name as full_name, tidied, for the backend to split', async () => {
    PATCH.mockResolvedValueOnce(res(200, {}));
    const { result } = renderHook(() => useSaveName(), { wrapper });
    await act(() =>
      result.current.mutateAsync({ userId: 'u1', name: { fullName: '  Chiamaka   Ngozi Obi ' } }),
    );
    expect(PATCH).toHaveBeenCalledWith('/api/v1/users/{user_id}/profile', {
      params: { path: { user_id: 'u1' } },
      body: { full_name: 'Chiamaka Ngozi Obi' },
    });
  });

  it('sends two fields as first_name + last_name', async () => {
    PATCH.mockResolvedValueOnce(res(200, {}));
    const { result } = renderHook(() => useSaveName(), { wrapper });
    await act(() =>
      result.current.mutateAsync({
        userId: 'u1',
        name: { firstName: ' Amara ', lastName: 'Okafor' },
      }),
    );
    expect(PATCH.mock.calls[0]![1].body).toEqual({ first_name: 'Amara', last_name: 'Okafor' });
  });

  it.each([
    ['enter a first and a last name, separated by a space', 'Enter your first and last name.'],
    [
      'a name needs at least one letter',
      'Use letters, spaces, hyphens, apostrophes or full stops.',
    ],
    [
      'a name cannot contain control or invisible characters',
      'Use letters, spaces, hyphens, apostrophes or full stops.',
    ],
  ])('reads the 422 "%s" in our words', async (message, shown) => {
    PATCH.mockResolvedValueOnce(
      res(422, undefined, { errors: [{ pointer: '/full_name', message }] }),
    );
    const { result } = renderHook(() => useSaveName(), { wrapper });
    await act(async () => {
      await expect(
        result.current.mutateAsync({ userId: 'u1', name: { fullName: 'Amara' } }),
      ).rejects.toThrow(shown);
    });
  });

  it('says "try again" for anything that isn’t a name refusal, never the server’s detail', async () => {
    PATCH.mockResolvedValueOnce(res(500, undefined, { detail: 'stack trace' }));
    const { result } = renderHook(() => useSaveName(), { wrapper });
    await act(async () => {
      await expect(
        result.current.mutateAsync({ userId: 'u1', name: { fullName: 'Amara Okafor' } }),
      ).rejects.toThrow('We couldn’t save your name. Try again.');
    });
    // Offline twice, and /me can't say the name landed.
    PATCH.mockRejectedValueOnce(new Error('offline')).mockRejectedValueOnce(new Error('offline'));
    GET.mockResolvedValueOnce(res(200, { id: 'u1', first_name: null }));
    await act(async () => {
      await expect(
        result.current.mutateAsync({ userId: 'u1', name: { fullName: 'Amara Okafor' } }),
      ).rejects.toThrow('We couldn’t save your name. Try again.');
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useSaveName (a proxy error after the save)', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
  );
  const save = () => {
    const { result } = renderHook(() => useSaveName(), { wrapper });
    return () => result.current.mutateAsync({ userId: 'u1', name: { fullName: 'Amara Okafor' } });
  };
  beforeEach(() => {
    PATCH.mockReset();
    GET.mockReset();
  });

  it('sends the PATCH once more after a 503', async () => {
    PATCH.mockResolvedValueOnce(res(503)).mockResolvedValueOnce(res(204));
    const run = save();
    await act(() => run());
    expect(PATCH).toHaveBeenCalledTimes(2);
    expect(GET).not.toHaveBeenCalled();
  });

  it('sends it once more after the line dropped', async () => {
    PATCH.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(res(204));
    const run = save();
    await act(() => run());
    expect(PATCH).toHaveBeenCalledTimes(2);
  });

  it('counts it saved when a second 503 leaves the name on /me', async () => {
    PATCH.mockResolvedValue(res(503));
    GET.mockResolvedValueOnce(res(200, { id: 'u1', first_name: 'Amara' }));
    const run = save();
    await act(() => run());
    expect(PATCH).toHaveBeenCalledTimes(2);
    expect(GET).toHaveBeenCalledWith('/api/v1/me');
  });

  it('says "try again" when /me has no name either', async () => {
    PATCH.mockResolvedValue(res(503));
    GET.mockResolvedValueOnce(res(200, { id: 'u1', first_name: null }));
    const run = save();
    await act(async () => {
      await expect(run()).rejects.toThrow('We couldn’t save your name. Try again.');
    });
    expect(PATCH).toHaveBeenCalledTimes(2);
  });

  it('never retries a name refusal', async () => {
    PATCH.mockResolvedValue(
      res(422, undefined, {
        errors: [{ pointer: '/full_name', message: 'enter a first and a last name' }],
      }),
    );
    const run = save();
    await act(async () => {
      await expect(run()).rejects.toThrow('Enter your first and last name.');
    });
    expect(PATCH).toHaveBeenCalledTimes(1);
    expect(GET).not.toHaveBeenCalled();
  });

  it('never retries the API’s own 500', async () => {
    PATCH.mockResolvedValue(res(500));
    const run = save();
    await act(async () => {
      await expect(run()).rejects.toThrow('We couldn’t save your name. Try again.');
    });
    expect(PATCH).toHaveBeenCalledTimes(1);
  });
});
