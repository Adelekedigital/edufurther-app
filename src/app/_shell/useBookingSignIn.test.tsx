import { act, renderHook } from '@testing-library/react';

const push = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace }) }));
vi.mock('@/lib/utils/useOnline', () => ({ useOnline: () => true }));

const send = vi.fn();
const verify = vi.fn();
const google = vi.fn();
const account = vi.fn();
const save = vi.fn();
const zoneFor = vi.fn();
vi.mock('@/lib/api/data/auth', () => ({
  sendSignInCode: (...a: unknown[]) => send(...a),
  verifySignInCode: (...a: unknown[]) => verify(...a),
  startGoogleSignIn: (...a: unknown[]) => google(...a),
}));
vi.mock('@/lib/api/data/signIn', () => ({
  fetchSignInAccount: () => account(),
  useSaveName: () => ({ mutateAsync: (v: unknown) => save(v) }),
  zoneToSave: (z: unknown) => zoneFor(z),
}));

const pick = { sessionTypeId: 'st1', time: '2026-10-20T09:00:00Z' };
const member = (over: object = {}) => ({
  kind: 'member',
  id: 'u1',
  firstName: null,
  isMentor: false,
  mentorApproved: false,
  ...over,
});

async function load(onboarding: boolean) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_ONBOARDING_ENABLED', onboarding ? 'true' : '');
  return import('./useBookingSignIn');
}

async function toCode(onboarding = false) {
  const { useBookingSignIn } = await load(onboarding);
  const hook = renderHook(() => useBookingSignIn({ profileHref: '/mentors/gbenga' }));
  act(() => hook.result.current.onEmailChange('Amara@Example.com'));
  await act(async () => hook.result.current.onSendCode());
  return hook;
}

beforeEach(() => {
  [push, replace, send, verify, google, account, save, zoneFor].forEach((f) => f.mockReset());
  send.mockResolvedValue({ ok: true });
  save.mockResolvedValue(undefined);
  window.sessionStorage.clear();
});
afterEach(() => vi.unstubAllEnvs());

describe('useBookingSignIn', () => {
  it('sends a code, then lets an existing account carry on in the modal', async () => {
    const { result } = await toCode();
    expect(result.current.stage).toBe('code');
    verify.mockResolvedValueOnce({ ok: true });
    account.mockResolvedValueOnce(member({ firstName: 'Amara' }));
    await act(async () => result.current.onVerify('482913'));
    expect(result.current.stage).toBe('done');
    expect(result.current.signedInAs).toBe('amara@example.com');
    expect(push).not.toHaveBeenCalled();
  });

  it('asks a new account for its name, then finishes in the modal while onboarding is off', async () => {
    const { result } = await toCode(false);
    verify.mockResolvedValueOnce({ ok: true });
    account.mockResolvedValueOnce(member());
    await act(async () => result.current.onVerify('482913'));
    expect(result.current.stage).toBe('name');
    act(() => result.current.onFullNameChange('Amara Okafor'));
    await act(async () => result.current.onFinish(pick));
    expect(save).toHaveBeenCalledWith({ userId: 'u1', name: { fullName: 'Amara Okafor' } });
    expect(result.current.stage).toBe('done');
    expect(result.current.signedInAs).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it.each([
    ['still has the UTC default', 'UTC', 'Europe/London'],
    ['already has a zone', 'Africa/Lagos', undefined],
  ])('saves the name with the device’s zone only when the account %s', async (_, z, sent) => {
    // The rule itself is zoneToSave's (signIn.test): here, the account's /me zone reaches it.
    zoneFor.mockImplementation((v) => (!v || v === 'UTC' ? 'Europe/London' : undefined));
    const { result } = await toCode(false);
    verify.mockResolvedValueOnce({ ok: true });
    account.mockResolvedValueOnce(member({ timezone: z }));
    await act(async () => result.current.onVerify('482913'));
    act(() => result.current.onFullNameChange('Amara Okafor'));
    await act(async () => result.current.onFinish(pick));
    expect(zoneFor).toHaveBeenCalledWith(z);
    expect(save.mock.calls[0]![0]).toEqual({
      userId: 'u1',
      name: { fullName: 'Amara Okafor' },
      timezone: sent,
    });
  });

  it('sends a new account to onboarding with the booking while onboarding is on', async () => {
    const { result } = await toCode(true);
    verify.mockResolvedValueOnce({ ok: true });
    account.mockResolvedValueOnce(member());
    await act(async () => result.current.onVerify('482913'));
    act(() => result.current.onFullNameChange('Amara Okafor'));
    await act(async () => result.current.onFinish(pick));
    expect(push).toHaveBeenCalledWith(
      '/onboarding?for=gbenga&sid=st1&time=2026-10-20T09%3A00%3A00Z',
    );
  });

  it('keeps the account on the name step when the name won’t save', async () => {
    const { result } = await toCode();
    verify.mockResolvedValueOnce({ ok: true });
    account.mockResolvedValueOnce(member());
    await act(async () => result.current.onVerify('482913'));
    act(() => result.current.onFullNameChange('Amara Okafor'));
    save.mockRejectedValueOnce(new Error('We couldn’t save your name. Try again.'));
    await act(async () => result.current.onFinish(pick));
    expect(result.current.stage).toBe('name');
    expect(result.current.nameError).toBe('We couldn’t save your name. Try again.');
    expect(result.current.finishing).toBe(false);
  });

  it('counts wrong codes like the sign-in page', async () => {
    const { result } = await toCode();
    verify.mockResolvedValue({ ok: false, reason: 'invalidCode' });
    await act(async () => result.current.onVerify('111111'));
    expect(result.current.codeProblem).toEqual({ kind: 'wrong', triesLeft: 4 });
  });

  it('shows the suspended stage for a banned account', async () => {
    const { result } = await toCode();
    verify.mockResolvedValueOnce({ ok: false, reason: 'banned' });
    await act(async () => result.current.onVerify('482913'));
    expect(result.current.stage).toBe('suspended');
  });

  it.each([
    ['unknown', 'sendUnavailable'],
    ['offline', 'sendFailed'],
  ])('says the code could not be sent (%s → %s)', async (reason, shown) => {
    send.mockResolvedValueOnce({ ok: false, reason });
    const { result } = await toCode();
    expect(result.current.stage).toBe('email');
    expect(result.current.error).toBe(shown);
  });

  it('sends Google back to the profile with the booking to reopen', async () => {
    const { useBookingSignIn } = await load(false);
    const { result } = renderHook(() => useBookingSignIn({ profileHref: '/mentors/gbenga' }));
    google.mockResolvedValueOnce({ ok: true });
    await act(async () => result.current.onGoogle(pick));
    expect(google).toHaveBeenCalledWith(
      '/mentors/gbenga?book=st1&at=2026-10-20T09%3A00%3A00Z',
      'signup',
      'mentee',
    );
    expect(result.current.googleBusy).toBe(true);
  });

  it('reports a Google start that never left', async () => {
    const { useBookingSignIn } = await load(false);
    const { result } = renderHook(() => useBookingSignIn({ profileHref: '/mentors/gbenga' }));
    google.mockResolvedValueOnce({ ok: false, reason: 'unknown' });
    await act(async () => result.current.onGoogle(pick));
    expect(result.current.googleBusy).toBe(false);
    expect(result.current.error).toBe('googleError');
  });

  it('sends a sign-in with no account to /, which explains it', async () => {
    const { result } = await toCode();
    verify.mockResolvedValueOnce({ ok: true });
    account.mockResolvedValueOnce({ kind: 'noAccount' });
    await act(async () => result.current.onVerify('482913'));
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('carries on in the modal when /me keeps failing, rather than drop the booking', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { result } = await toCode();
    verify.mockResolvedValueOnce({ ok: true });
    account.mockResolvedValue({ kind: 'error' });
    await act(async () => {
      void result.current.onVerify('482913');
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(replace).not.toHaveBeenCalled();
    expect(result.current.stage).toBe('done');
    expect(result.current.signedInAs).toBe('amara@example.com');
    expect(result.current.verifying).toBe(false);
    vi.useRealTimers();
  });

  it('carries on when something throws after the code checked out', async () => {
    const { result } = await toCode();
    verify.mockResolvedValueOnce({ ok: true });
    account.mockRejectedValueOnce(new Error('boom'));
    await act(async () => result.current.onVerify('482913'));
    expect(result.current.stage).toBe('done');
    expect(result.current.verifying).toBe(false);
  });

  it('changes nothing when the modal was closed while the code was checked', async () => {
    const hook = await toCode();
    let resolveAccount: (v: unknown) => void = () => {};
    verify.mockResolvedValueOnce({ ok: true });
    account.mockReturnValueOnce(new Promise((r) => (resolveAccount = r)));
    let pending: Promise<void> | undefined;
    act(() => {
      pending = Promise.resolve(hook.result.current.onVerify('482913'));
    });
    hook.unmount();
    await act(async () => {
      resolveAccount({ kind: 'noAccount' });
      await pending;
    });
    expect(replace).not.toHaveBeenCalled();
  });

  it('says nothing failed when a send is already out', async () => {
    const { useBookingSignIn } = await load(false);
    const { result } = renderHook(() => useBookingSignIn({ profileHref: '/mentors/gbenga' }));
    act(() => result.current.onEmailChange('amara@example.com'));
    let resolve: (v: unknown) => void = () => {};
    send.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    await act(async () => {
      result.current.onSendCode();
      result.current.onSendCode();
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeUndefined();
    await act(async () => resolve({ ok: true }));
    expect(result.current.stage).toBe('code');
  });

  it('keeps "Create account" busy while the page moves on to onboarding', async () => {
    const { result } = await toCode(true);
    verify.mockResolvedValueOnce({ ok: true });
    account.mockResolvedValueOnce(member());
    await act(async () => result.current.onVerify('482913'));
    act(() => result.current.onFullNameChange('Amara Okafor'));
    await act(async () => result.current.onFinish(pick));
    expect(push).toHaveBeenCalledTimes(1);
    expect(result.current.finishing).toBe(true);
  });
});
