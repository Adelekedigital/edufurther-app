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
    PATCH.mockRejectedValueOnce(new Error('offline'));
    await act(async () => {
      await expect(
        result.current.mutateAsync({ userId: 'u1', name: { fullName: 'Amara Okafor' } }),
      ).rejects.toThrow('We couldn’t save your name. Try again.');
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
