import { act, renderHook } from '@testing-library/react';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

let session: { status: string; userId?: string } = { status: 'none' };
vi.mock('@/lib/api/data/session', () => ({ useSession: () => session }));
vi.mock('@/lib/utils/useOnline', () => ({ useOnline: () => true }));

const send = vi.fn();
const verify = vi.fn();
const google = vi.fn();
const account = vi.fn();
const user = vi.fn();
const save = vi.fn();
vi.mock('@/lib/api/data/auth', () => ({
  sendSignInCode: (...a: unknown[]) => send(...a),
  verifySignInCode: (...a: unknown[]) => verify(...a),
  startGoogleSignIn: (...a: unknown[]) => google(...a),
  signedInUser: () => user(),
}));
vi.mock('@/lib/api/data/signIn', () => ({
  fetchSignInAccount: () => account(),
  useSaveName: () => ({ mutateAsync: (v: unknown) => save(v) }),
}));

const { useSignInFlow, TOAST_MS, CODE_LIFETIME_MS, ACCOUNT_RETRY_MS } =
  await import('./useSignInFlow');

const member = (over: object = {}) => ({
  kind: 'member',
  id: 'u1',
  firstName: null,
  isAdmin: false,
  isMentor: false,
  mentorApproved: false,
  ...over,
});

type Opts = Parameters<typeof useSignInFlow>[0];
const opts = (over: Partial<Opts> = {}): Opts => ({
  mode: 'signup',
  role: 'mentee',
  next: null,
  googleReturn: false,
  googleFailed: false,
  ...over,
});

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  session = { status: 'none' };
  [replace, send, verify, google, account, user, save].forEach((f) => f.mockReset());
  send.mockResolvedValue({ ok: true });
  save.mockResolvedValue(undefined);
  window.sessionStorage.clear();
  window.localStorage.clear();
});
afterEach(() => vi.useRealTimers());

async function toCode(
  over: Partial<Opts> = {},
  email = 'amara@example.com',
  name = 'Amara Okafor',
) {
  const hook = renderHook((o: Opts) => useSignInFlow(o), { initialProps: opts(over) });
  act(() => {
    hook.result.current.form.onEmailChange(email);
    hook.result.current.form.onFullNameChange(name);
  });
  await act(async () => hook.result.current.form.onSendCode());
  return hook;
}

describe('useSignInFlow — sign-up with a code', () => {
  it('sends, verifies, saves the typed name, toasts, then goes on after 1.4 s', async () => {
    const { result } = await toCode();
    expect(send).toHaveBeenCalledWith('amara@example.com', null);
    expect(result.current.form.step).toBe('code');
    expect(result.current.form.resendIn).toBe(30);

    verify.mockResolvedValueOnce({ ok: true });
    account.mockResolvedValueOnce(member());
    await act(async () => result.current.form.onVerify!('482913'));
    await flush();

    expect(save).toHaveBeenCalledWith({ userId: 'u1', name: { fullName: 'Amara Okafor' } });
    expect(result.current.toast).toMatchObject({
      title: 'Account created. Welcome, Amara',
      href: '/home',
    });
    expect(result.current.form.redirecting).toBe(true);
    expect(replace).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(TOAST_MS));
    expect(replace).toHaveBeenCalledWith('/home');
    expect(window.localStorage.getItem('ef-last-sign-in')).toBe('email');
  });

  it('tells an existing account it already has one, and keeps its name', async () => {
    const { result } = await toCode();
    verify.mockResolvedValueOnce({ ok: true });
    account.mockResolvedValueOnce(member({ firstName: 'Amara' }));
    await act(async () => result.current.form.onVerify!('482913'));
    await flush();
    expect(save).not.toHaveBeenCalled();
    expect(result.current.toast).toMatchObject({ title: 'You already have an account' });
  });

  it('keeps the session and offers a retry on the finish step when the name won’t save', async () => {
    const { result } = await toCode();
    verify.mockResolvedValueOnce({ ok: true });
    account.mockResolvedValueOnce(member());
    save.mockRejectedValueOnce(new Error('We couldn’t save your name. Try again.'));
    await act(async () => result.current.form.onVerify!('482913'));
    await flush();
    expect(result.current.form.step).toBe('finish');
    expect(result.current.form.nameError).toBe('We couldn’t save your name. Try again.');
    expect(result.current.toast).toBeNull();

    await act(async () => result.current.form.onFinish!());
    expect(result.current.toast).toMatchObject({ title: 'Account created. Welcome, Amara' });
  });

  it('stays on the finish step when the name won’t save, even once the session lands', async () => {
    const { result, rerender } = await toCode();
    verify.mockResolvedValueOnce({ ok: true });
    account.mockResolvedValueOnce(member());
    // The save may have landed behind the proxy error: a later /me has the name.
    account.mockResolvedValue(member({ firstName: 'Amara' }));
    save.mockRejectedValueOnce(new Error('We couldn’t save your name. Try again.'));
    await act(async () => result.current.form.onVerify!('482913'));
    session = { status: 'present', userId: 'u1' };
    rerender(opts());
    await flush();
    act(() => vi.advanceTimersByTime(TOAST_MS * 2));
    await flush();
    expect(result.current.form.step).toBe('finish');
    expect(result.current.form.nameError).toBe('We couldn’t save your name. Try again.');
    expect(result.current.toast).toBeNull();
    expect(account).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });
});

describe('useSignInFlow — log-in', () => {
  it('sends a returning mentor to the dashboard', async () => {
    const { result } = await toCode({ mode: 'login' }, 'gbenga@example.com', '');
    verify.mockResolvedValueOnce({ ok: true });
    account.mockResolvedValueOnce(
      member({ firstName: 'Gbenga', isMentor: true, mentorApproved: true }),
    );
    await act(async () => result.current.form.onVerify!('482913'));
    await flush();
    act(() => vi.advanceTimersByTime(TOAST_MS));
    expect(replace).toHaveBeenCalledWith('/dashboard');
  });

  it('asks an unknown email for a name, then creates the account', async () => {
    const { result } = await toCode({ mode: 'login' }, 'new@example.com', '');
    verify.mockResolvedValueOnce({ ok: true });
    account.mockResolvedValueOnce(member());
    await act(async () => result.current.form.onVerify!('482913'));
    await flush();
    expect(result.current.form.step).toBe('finish');
    act(() => result.current.form.onFullNameChange('Kwame Mensah'));
    await act(async () => result.current.form.onFinish!());
    expect(save).toHaveBeenCalledWith({ userId: 'u1', name: { fullName: 'Kwame Mensah' } });
    expect(result.current.toast).toMatchObject({ title: 'Account created. Welcome, Kwame' });
  });
});

describe('useSignInFlow — code problems', () => {
  it('counts wrong codes down and locks on the fifth', async () => {
    const { result } = await toCode({ mode: 'login' });
    verify.mockResolvedValue({ ok: false, reason: 'invalidCode' });
    await act(async () => result.current.form.onVerify!('111111'));
    expect(result.current.form.codeProblem).toEqual({ kind: 'wrong', triesLeft: 4 });
    act(() => result.current.form.onCodeChange!('2'));
    expect(result.current.form.codeProblem).toBeUndefined();
    for (let i = 0; i < 4; i++) await act(async () => result.current.form.onVerify!('111111'));
    expect(result.current.form.codeProblem).toEqual({ kind: 'locked' });
  });

  it('calls a refused code expired once ten minutes have passed', async () => {
    const { result } = await toCode({ mode: 'login' });
    verify.mockResolvedValueOnce({ ok: false, reason: 'invalidCode' });
    act(() => vi.advanceTimersByTime(CODE_LIFETIME_MS));
    await act(async () => result.current.form.onVerify!('111111'));
    expect(result.current.form.codeProblem).toEqual({ kind: 'expired' });
  });

  it('shows the suspended step for a banned account', async () => {
    const { result } = await toCode({ mode: 'login' });
    verify.mockResolvedValueOnce({ ok: false, reason: 'banned' });
    await act(async () => result.current.form.onVerify!('482913'));
    expect(result.current.form.step).toBe('suspended');
  });

  it('counts nothing when the check itself failed (offline)', async () => {
    const { result } = await toCode({ mode: 'login' });
    verify.mockResolvedValueOnce({ ok: false, reason: 'offline' });
    await act(async () => result.current.form.onVerify!('482913'));
    expect(result.current.form.codeProblem).toBeUndefined();
    expect(result.current.form.verifying).toBe(false);
  });

  it.each([
    // The server refused it (e.g. Supabase couldn't send the email) or rate-limited it:
    // "check your connection" would send them looking for the wrong problem.
    ['unknown', 'sendUnavailable'],
    ['rateLimited', 'sendUnavailable'],
    ['offline', 'sendFailed'],
  ])('says the code could not be sent (%s → %s)', async (reason, shown) => {
    send.mockResolvedValueOnce({ ok: false, reason });
    const { result } = await toCode();
    expect(result.current.form.step).toBe('start');
    expect(result.current.form.startError).toBe(shown);
  });

  it('resends after the wait, and says so', async () => {
    const { result } = await toCode();
    act(() => vi.advanceTimersByTime(30_000));
    await act(async () => result.current.form.onResend!());
    expect(send).toHaveBeenCalledTimes(2);
    expect(result.current.form.resentCount).toBe(1);
    expect(result.current.form.resendIn).toBe(30);
  });
});

describe('useSignInFlow — Google', () => {
  // Supabase's Google identity carries full_name / name, not given / family names.
  const fromGoogle = (fullName: string | null) => ({
    email: 'tolu@example.com',
    givenName: null,
    familyName: null,
    fullName,
    googleJustLinked: false,
  });

  it('names a new Google account from Google’s full name, with no name step', async () => {
    session = { status: 'present', userId: 'u1' };
    account.mockResolvedValueOnce(member());
    user.mockResolvedValue(fromGoogle('Tolu Adebayo'));
    const { result } = renderHook(() => useSignInFlow(opts({ googleReturn: true })));
    await flush();
    await flush();
    expect(save).toHaveBeenCalledWith({ userId: 'u1', name: { fullName: 'Tolu Adebayo' } });
    expect(result.current.form.step).toBe('start');
    expect(result.current.toast).toMatchObject({ title: 'Account created with Google' });
    expect(window.localStorage.getItem('ef-last-sign-in')).toBe('google');
  });

  it('joins given and family names when Google sends both', async () => {
    session = { status: 'present', userId: 'u1' };
    account.mockResolvedValueOnce(member());
    user.mockResolvedValue({ givenName: 'Tolu', familyName: 'Adebayo', googleJustLinked: false });
    renderHook(() => useSignInFlow(opts({ googleReturn: true })));
    await flush();
    await flush();
    expect(save).toHaveBeenCalledWith({ userId: 'u1', name: { fullName: 'Tolu Adebayo' } });
  });

  it('puts a one-word Google name in the finish step to complete', async () => {
    session = { status: 'present', userId: 'u1' };
    account.mockResolvedValueOnce(member());
    user.mockResolvedValue(fromGoogle('Tolu'));
    const { result } = renderHook(() => useSignInFlow(opts({ googleReturn: true })));
    await flush();
    await flush();
    expect(result.current.form.step).toBe('finish');
    expect(result.current.form.fullName).toBe('Tolu');
    expect(save).not.toHaveBeenCalled();
  });

  it('shows an empty finish step when Google sends no name', async () => {
    session = { status: 'present', userId: 'u1' };
    account.mockResolvedValueOnce(member());
    user.mockResolvedValue(fromGoogle(null));
    const { result } = renderHook(() => useSignInFlow(opts({ googleReturn: true })));
    await flush();
    await flush();
    expect(result.current.form.step).toBe('finish');
    expect(result.current.form.fullName).toBe('');
    expect(save).not.toHaveBeenCalled();
  });

  it('asks once for a full name when Google sends no family name', async () => {
    session = { status: 'present', userId: 'u1' };
    account.mockResolvedValueOnce(member());
    user.mockResolvedValue({
      email: 'tolu@example.com',
      givenName: 'Tolu',
      familyName: null,
      googleJustLinked: false,
    });
    const { result } = renderHook(() => useSignInFlow(opts({ googleReturn: true })));
    await flush();
    await flush();
    expect(result.current.form.step).toBe('finish');
    expect(result.current.form.fullName).toBe('Tolu');
    // The finish step's sentence names the account: Google's email, as nobody typed one.
    expect(result.current.form.email).toBe('tolu@example.com');
    expect(save).not.toHaveBeenCalled();
  });

  it('says Google is now linked when it joined an existing account', async () => {
    session = { status: 'present', userId: 'u1' };
    account.mockResolvedValueOnce(member({ firstName: 'Amara' }));
    user.mockResolvedValue({ givenName: 'Amara', familyName: 'Okafor', googleJustLinked: true });
    const { result } = renderHook(() => useSignInFlow(opts({ mode: 'login', googleReturn: true })));
    await flush();
    await flush();
    expect(result.current.toast).toMatchObject({ icon: 'link' });
  });

  it('shows the Google error when it came back without a session', () => {
    const { result } = renderHook(() => useSignInFlow(opts({ googleFailed: true })));
    expect(result.current.form.startError).toBe('googleError');
  });

  it('reports a Google start that never left', async () => {
    google.mockResolvedValueOnce({ ok: false, reason: 'unknown' });
    const { result } = renderHook(() => useSignInFlow(opts()));
    await act(async () => result.current.form.onGoogle());
    expect(google).toHaveBeenCalledWith(null, 'signup', 'mentee');
    expect(result.current.form.googleBusy).toBe(false);
    expect(result.current.form.startError).toBe('googleError');
  });
});

describe('useSignInFlow — already signed in', () => {
  it('goes straight to the account’s home, with no toast', async () => {
    session = { status: 'present', userId: 'u1' };
    account.mockResolvedValueOnce(
      member({ firstName: 'Gbenga', isMentor: true, mentorApproved: true }),
    );
    const { result } = renderHook(() => useSignInFlow(opts({ mode: 'login' })));
    await flush();
    expect(replace).toHaveBeenCalledWith('/dashboard');
    expect(result.current.toast).toBeNull();
  });

  it('or to next, when one was given', async () => {
    session = { status: 'present', userId: 'u1' };
    account.mockResolvedValueOnce(member({ firstName: 'Amara' }));
    renderHook(() => useSignInFlow(opts({ mode: 'login', next: '/bookings' })));
    await flush();
    expect(replace).toHaveBeenCalledWith('/bookings');
  });
});

describe('useSignInFlow — review fixes', () => {
  it('redirects once, with the toast, when the session lands while the code is being checked', async () => {
    const hook = await toCode();
    let resolveVerify: (v: unknown) => void = () => {};
    verify.mockReturnValueOnce(new Promise((r) => (resolveVerify = r)));
    account.mockResolvedValue(member({ firstName: 'Amara' }));
    let pending: Promise<void> | undefined;
    act(() => {
      pending = Promise.resolve(hook.result.current.form.onVerify!('482913'));
    });
    // The SDK reports the new session before verify's promise settles.
    session = { status: 'present', userId: 'u1' };
    hook.rerender(opts());
    await act(async () => {
      resolveVerify({ ok: true });
      await pending;
    });
    await flush();
    act(() => vi.advanceTimersByTime(TOAST_MS));
    expect(account).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/home');
    expect(hook.result.current.toast).not.toBeNull();
  });

  it('checks a code once when autofill and Enter land in the same tick', async () => {
    const { result } = await toCode({ mode: 'login' });
    verify.mockResolvedValue({ ok: false, reason: 'invalidCode' });
    await act(async () => {
      void result.current.form.onVerify!('111111');
      void result.current.form.onVerify!('111111');
    });
    expect(verify).toHaveBeenCalledTimes(1);
    expect(result.current.form.codeProblem).toEqual({ kind: 'wrong', triesLeft: 4 });
  });

  it('reads the account once on a Google return', async () => {
    session = { status: 'present', userId: 'u1' };
    account.mockResolvedValue(member({ firstName: 'Amara' }));
    user.mockResolvedValue({
      email: 'a@b.co',
      givenName: 'Amara',
      familyName: 'Okafor',
      googleJustLinked: false,
    });
    renderHook(() => useSignInFlow(opts({ mode: 'login', googleReturn: true })));
    await flush();
    await flush();
    expect(account).toHaveBeenCalledTimes(1);
  });

  it('sends a sign-in with no account to /, never to next', async () => {
    const { result } = await toCode({ next: '/bookings' });
    verify.mockResolvedValueOnce({ ok: true });
    account.mockResolvedValueOnce({ kind: 'noAccount' });
    await act(async () => result.current.form.onVerify!('482913'));
    await flush();
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('tries GET /me again before giving up, and keeps the typed name when it recovers', async () => {
    const { result } = await toCode();
    verify.mockResolvedValueOnce({ ok: true });
    account.mockResolvedValueOnce({ kind: 'error' }).mockResolvedValueOnce(member());
    await act(async () => {
      void result.current.form.onVerify!('482913');
      await vi.advanceTimersByTimeAsync(ACCOUNT_RETRY_MS[0]!);
    });
    await flush();
    expect(account).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenCalledWith({ userId: 'u1', name: { fullName: 'Amara Okafor' } });
  });

  it('goes on to next when GET /me keeps failing', async () => {
    const { result } = await toCode({ next: '/bookings' });
    verify.mockResolvedValueOnce({ ok: true });
    account.mockResolvedValue({ kind: 'error' });
    await act(async () => {
      void result.current.form.onVerify!('482913');
      await vi.advanceTimersByTimeAsync(ACCOUNT_RETRY_MS.reduce((a, b) => a + b, 0));
    });
    await flush();
    expect(account).toHaveBeenCalledTimes(1 + ACCOUNT_RETRY_MS.length);
    expect(replace).toHaveBeenCalledWith('/bookings');
    expect(result.current.form.verifying).toBe(false);
  });

  it('says a failed resend failed, and sends once for a double press', async () => {
    const { result } = await toCode();
    act(() => vi.advanceTimersByTime(30_000));
    let resolve: (v: unknown) => void = () => {};
    send.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    await act(async () => {
      result.current.form.onResend!();
      result.current.form.onResend!();
    });
    await act(async () => resolve({ ok: false, reason: 'rateLimited' }));
    expect(send).toHaveBeenCalledTimes(2); // the first send, then one resend
    expect(result.current.form.codeProblem).toEqual({ kind: 'resendFailed' });
    act(() => result.current.form.onCodeChange!('4'));
    expect(result.current.form.codeProblem).toBeUndefined();
  });

  it('cancels the redirect when the page is left during the toast', async () => {
    const { result, unmount } = await toCode();
    verify.mockResolvedValueOnce({ ok: true });
    account.mockResolvedValueOnce(member({ firstName: 'Amara' }));
    await act(async () => result.current.form.onVerify!('482913'));
    await flush();
    expect(result.current.toast).not.toBeNull();
    unmount();
    act(() => vi.advanceTimersByTime(TOAST_MS));
    expect(replace).not.toHaveBeenCalled();
  });

  it('keeps Google’s names in the field when saving them is refused', async () => {
    session = { status: 'present', userId: 'u1' };
    account.mockResolvedValueOnce(member());
    user.mockResolvedValue({
      email: 'a@b.co',
      givenName: 'Tolu',
      familyName: 'Ade',
      googleJustLinked: false,
    });
    save.mockRejectedValueOnce(
      new Error('Use letters, spaces, hyphens, apostrophes or full stops.'),
    );
    const { result } = renderHook(() => useSignInFlow(opts({ googleReturn: true })));
    await flush();
    await flush();
    expect(result.current.form.step).toBe('finish');
    expect(result.current.form.fullName).toBe('Tolu Ade');
    expect(result.current.form.email).toBe('a@b.co');
    expect(result.current.form.nameError).toMatch(/Use letters/);
  });

  it('asks an account that was never named for its name, even when already signed in', async () => {
    session = { status: 'present', userId: 'u1' };
    account.mockResolvedValueOnce(member());
    user.mockResolvedValue({
      email: 'amara@example.com',
      givenName: null,
      familyName: null,
      googleJustLinked: false,
    });
    const { result } = renderHook(() => useSignInFlow(opts({ mode: 'login' })));
    await flush();
    await flush();
    expect(replace).not.toHaveBeenCalled();
    expect(result.current.form.step).toBe('finish');
    expect(result.current.form.email).toBe('amara@example.com');
    act(() => result.current.form.onFullNameChange('Amara Okafor'));
    await act(async () => result.current.form.onFinish!());
    expect(save).toHaveBeenCalledWith({ userId: 'u1', name: { fullName: 'Amara Okafor' } });
  });

  it('holds the form still while a signed-in account is being read', () => {
    session = { status: 'present', userId: 'u1' };
    account.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useSignInFlow(opts({ mode: 'login' })));
    expect(result.current.form.redirecting).toBe(true);
  });
});
