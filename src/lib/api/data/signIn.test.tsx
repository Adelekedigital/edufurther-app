import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const GET = vi.fn();
const PATCH = vi.fn();
vi.mock('./http', () => ({
  api: { GET: (...a: unknown[]) => GET(...a), PATCH: (...a: unknown[]) => PATCH(...a) },
}));

// The device's zone, as Intl reports it; each test starts in New York.
let zone = 'America/New_York';
vi.mock('@/lib/utils/format', () => ({ deviceTimeZone: () => zone }));
beforeEach(() => {
  zone = 'America/New_York';
});

const { useSaveName, fetchSignInAccount, zoneToSave } = await import('./signIn');

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
      // No mentor profile: nothing to show.
      mentorApprovedSeen: true,
      onboardingComplete: null,
      signedUpAsMentor: false,
      hasMentorProfile: false,
      timezone: null,
    });
  });

  it('signs a declined applicant who chose mentee in as a mentee', async () => {
    GET.mockResolvedValueOnce(
      res(200, {
        id: 'u4',
        first_name: 'Gbenga',
        primary_role: 'mentee',
        mentor_profile: { approval_status: 'declined' },
      }),
    );
    expect(await fetchSignInAccount()).toMatchObject({ isMentor: false, mentorApproved: false });
  });

  it('carries whether the approved screen was seen (pending backend approved_seen_at)', async () => {
    GET.mockResolvedValueOnce(
      res(200, {
        id: 'u2',
        first_name: 'Gbenga',
        mentor_profile: { approval_status: 'approved', approved_seen_at: null },
      }),
    );
    expect(await fetchSignInAccount()).toMatchObject({
      mentorApproved: true,
      mentorApprovedSeen: false,
    });
  });

  it('carries /me timezone, so a zone the account has is never overwritten', async () => {
    GET.mockResolvedValueOnce(res(200, { id: 'u1', first_name: null, timezone: 'Africa/Lagos' }));
    expect(await fetchSignInAccount()).toMatchObject({ timezone: 'Africa/Lagos' });
  });

  it('carries /me onboarding.complete, so an unfinished mentee goes back to it', async () => {
    GET.mockResolvedValueOnce(
      res(200, {
        id: 'u3',
        first_name: 'Amara',
        is_admin: false,
        mentor_profile: null,
        onboarding: { complete: false, missing: ['field'] },
      }),
    );
    expect(await fetchSignInAccount()).toMatchObject({ onboardingComplete: false });
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

  it('sends the timezone the caller passes, with either shape', async () => {
    PATCH.mockResolvedValue(res(200, {}));
    const { result } = renderHook(() => useSaveName(), { wrapper });
    const timezone = 'America/New_York';
    await act(() =>
      result.current.mutateAsync({ userId: 'u1', name: { fullName: 'Amara Okafor' }, timezone }),
    );
    await act(() =>
      result.current.mutateAsync({
        userId: 'u1',
        name: { firstName: 'Amara', lastName: 'Okafor' },
        timezone,
      }),
    );
    expect(PATCH.mock.calls[0]![1].body).toEqual({ full_name: 'Amara Okafor', timezone });
    expect(PATCH.mock.calls[1]![1].body).toEqual({
      first_name: 'Amara',
      last_name: 'Okafor',
      timezone,
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

describe('zoneToSave (the device’s zone, only for an account without one)', () => {
  it.each([
    ['has none', null],
    ['has an empty one', ''],
    ['still has the backend’s UTC default', 'UTC'],
  ])('gives the device’s zone when the account %s', (_, accountZone) => {
    expect(zoneToSave(accountZone)).toBe('America/New_York');
  });

  it('never overwrites a zone the account already has', () => {
    expect(zoneToSave('Africa/Lagos')).toBeUndefined();
  });

  it.each([
    ['empty', ''],
    ['not a zone', 'Mars/Olympus_Mons'],
  ])('gives nothing when the device’s is %s', (_, z) => {
    zone = z;
    expect(zoneToSave(null)).toBeUndefined();
  });
});

describe('useSaveName (a refused timezone never stops the name)', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
  );
  const save = (result: { current: ReturnType<typeof useSaveName> }) =>
    result.current.mutateAsync({
      userId: 'u1',
      name: { fullName: 'Amara Okafor' },
      timezone: 'America/New_York',
    });
  beforeEach(() => {
    PATCH.mockReset();
    GET.mockReset();
  });

  it.each([
    ['on /timezone', { errors: [{ pointer: '/timezone', message: 'not a zone' }] }],
    ['with no name pointer', { detail: 'Unprocessable' }],
  ])('a 422 %s: the name goes once more without the zone', async (_, error) => {
    PATCH.mockResolvedValueOnce(res(422, undefined, error)).mockResolvedValueOnce(res(200, {}));
    const { result } = renderHook(() => useSaveName(), { wrapper });
    await act(() => save(result));
    expect(PATCH).toHaveBeenCalledTimes(2);
    expect(PATCH.mock.calls[0]![1].body).toEqual({
      full_name: 'Amara Okafor',
      timezone: 'America/New_York',
    });
    expect(PATCH.mock.calls[1]![1].body).toEqual({ full_name: 'Amara Okafor' });
  });

  it('the name refused on the retry: its own words', async () => {
    PATCH.mockResolvedValueOnce(
      res(422, undefined, { errors: [{ pointer: '/timezone', message: 'not a zone' }] }),
    ).mockResolvedValueOnce(
      res(422, undefined, {
        errors: [{ pointer: '/full_name', message: 'enter a first and a last name' }],
      }),
    );
    const { result } = renderHook(() => useSaveName(), { wrapper });
    await act(async () => {
      await expect(save(result)).rejects.toThrow('Enter your first and last name.');
    });
  });

  it('a 422 on a name field: the name’s words, and no retry without the zone', async () => {
    PATCH.mockResolvedValueOnce(
      res(422, undefined, {
        errors: [
          { pointer: '/timezone', message: 'not a zone' },
          { pointer: '/full_name', message: 'enter a first and a last name' },
        ],
      }),
    );
    const { result } = renderHook(() => useSaveName(), { wrapper });
    await act(async () => {
      await expect(save(result)).rejects.toThrow('Enter your first and last name.');
    });
    expect(PATCH).toHaveBeenCalledOnce();
  });

  it('no zone sent: a 422 isn’t retried', async () => {
    PATCH.mockResolvedValueOnce(res(422, undefined, { detail: 'Unprocessable' }));
    const { result } = renderHook(() => useSaveName(), { wrapper });
    await act(async () => {
      await expect(
        result.current.mutateAsync({ userId: 'u1', name: { fullName: 'Amara Okafor' } }),
      ).rejects.toThrow('We couldn’t save your name. Try again.');
    });
    expect(PATCH).toHaveBeenCalledOnce();
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

  it('checks /me when the retry fails another way after a proxy error', async () => {
    PATCH.mockResolvedValueOnce(res(503)).mockResolvedValueOnce(res(500));
    GET.mockResolvedValueOnce(res(200, { id: 'u1', first_name: 'Amara' }));
    const run = save();
    await act(() => run());
    expect(GET).toHaveBeenCalledWith('/api/v1/me');
  });

  it('does not count a different name on /me as this save', async () => {
    PATCH.mockResolvedValue(res(503));
    GET.mockResolvedValueOnce(res(200, { id: 'u1', first_name: 'Bola' }));
    const run = save();
    await act(async () => {
      await expect(run()).rejects.toThrow('We couldn’t save your name. Try again.');
    });
  });

  it('says "try again" when /me cannot be read either', async () => {
    PATCH.mockResolvedValue(res(503));
    GET.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const run = save();
    await act(async () => {
      await expect(run()).rejects.toThrow('We couldn’t save your name. Try again.');
    });
  });

  it('refreshes the viewer when /me says the name landed', async () => {
    PATCH.mockResolvedValue(res(503));
    GET.mockResolvedValueOnce(res(200, { id: 'u1', first_name: 'Amara' }));
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useSaveName(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });
    await act(() =>
      result.current.mutateAsync({ userId: 'u1', name: { fullName: 'Amara Okafor' } }),
    );
    expect(invalidate).toHaveBeenCalled();
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
