import { act, renderHook } from '@testing-library/react';

const replace = vi.fn();
vi.mock('@tanstack/react-query', async (orig) => ({
  ...(await orig<typeof import('@tanstack/react-query')>()),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

let session: { status: string; userId?: string } = { status: 'none' };
vi.mock('@/lib/api/data/session', () => ({ useSession: () => session }));
vi.mock('@/lib/utils/useOnline', () => ({ useOnline: () => true }));

const send = vi.fn();
const verify = vi.fn();
const account = vi.fn();
const claim = vi.fn();
const user = vi.fn();
const save = vi.fn();
vi.mock('@/lib/api/data/auth', () => ({
  sendSignInCode: (...a: unknown[]) => send(...a),
  verifySignInCode: (...a: unknown[]) => verify(...a),
  startGoogleSignIn: vi.fn(),
  signedInUser: () => user(),
  useSignOutHere: () => vi.fn(),
}));
vi.mock('@/lib/api/data/signIn', () => ({
  fetchSignInAccount: () => account(),
  useSaveName: () => ({ mutateAsync: (v: unknown) => save(v) }),
  zoneToSave: () => undefined,
}));
vi.mock('@/lib/api/data/invite', () => ({
  claimInvite: (_qc: unknown, code: string) => claim(code),
}));

const { useSignInFlow, TOAST_MS } = await import('./useSignInFlow');
const { rememberInviteCode, storedInviteCode } = await import('@/lib/utils/inviteCode');

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
  inviteFrom: 'Damilola',
  googleReturn: false,
  googleFailed: false,
  ...over,
});

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

/** Through the code step to a verified sign-in, as `acct`. */
async function signIn(acct: object, over: Partial<Opts> = {}) {
  const hook = renderHook((o: Opts) => useSignInFlow(o), { initialProps: opts(over) });
  act(() => {
    hook.result.current.form.onEmailChange('amara@example.com');
    hook.result.current.form.onFullNameChange('Amara Okafor');
  });
  await act(async () => hook.result.current.form.onSendCode());
  verify.mockResolvedValueOnce({ ok: true });
  account.mockResolvedValueOnce(acct);
  await act(async () => hook.result.current.form.onVerify!('482913'));
  await flush();
  return hook;
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  session = { status: 'none' };
  [replace, send, verify, account, claim, user, save].forEach((f) => f.mockReset());
  save.mockResolvedValue(undefined);
  send.mockResolvedValue({ ok: true });
  claim.mockResolvedValue(undefined);
  sessionStorage.clear();
  localStorage.clear();
  rememberInviteCode('damilola-7k2x');
});
afterEach(() => vi.useRealTimers());

describe('useSignInFlow — the invite a new account arrived with (issue 281)', () => {
  it('a new account claims it once named, says so in the toast, and clears it', async () => {
    const { result } = await signIn(member());
    expect(claim).toHaveBeenCalledTimes(1);
    expect(claim).toHaveBeenCalledWith('damilola-7k2x');
    expect(result.current.toast).toMatchObject({
      title: 'Account created. Welcome, Amara',
      body: 'Damilola’s invite is saved. Next, let’s find your first mentor…',
    });
    expect(storedInviteCode()).toBeNull();
    act(() => vi.advanceTimersByTime(TOAST_MS));
    expect(replace).toHaveBeenCalledWith('/home');
  });

  it.each([
    ['404 unknown, revoked or retired', { status: 404 }],
    ['409 own or already claimed', { status: 409 }],
    ['409 account too old', { status: 409, type: '/problems/invite-for-new-accounts' }],
    ['422 validation', { status: 422 }],
    ['a server error or timeout', { status: 500 }],
  ])('fails quietly on %s: no error, no mention, the code cleared', async (_label, error) => {
    claim.mockRejectedValueOnce(error);
    const { result } = await signIn(member());
    expect(claim).toHaveBeenCalledTimes(1);
    expect(result.current.form.nameError).toBeUndefined();
    expect(result.current.form.step).not.toBe('finish');
    expect(result.current.toast).toMatchObject({ body: 'Next, let’s find your first mentor…' });
    expect(storedInviteCode()).toBeNull();
  });

  it('an existing account never claims, and the code is cleared', async () => {
    const { result } = await signIn(member({ firstName: 'Amara' }), { mode: 'login' });
    expect(claim).not.toHaveBeenCalled();
    expect(result.current.toast?.body).not.toContain('invite');
    expect(storedInviteCode()).toBeNull();
  });

  it('an existing account already signed in on the page never claims', async () => {
    session = { status: 'present', userId: 'u1' };
    account.mockResolvedValueOnce(member({ firstName: 'Amara' }));
    renderHook(() => useSignInFlow(opts()));
    await flush();
    await flush();
    expect(claim).not.toHaveBeenCalled();
    expect(storedInviteCode()).toBeNull();
  });

  it('a new Google account claims it once', async () => {
    session = { status: 'present', userId: 'u1' };
    account.mockResolvedValueOnce(member());
    user.mockResolvedValue({ givenName: 'Amara', familyName: 'Okafor', email: 'a@x.com' });
    const { result } = renderHook(() => useSignInFlow(opts({ googleReturn: true })));
    await flush();
    await flush();
    await flush();
    expect(claim).toHaveBeenCalledTimes(1);
    expect(result.current.toast?.body).toBe(
      'Damilola’s invite is saved. Next, let’s find your first mentor…',
    );
  });

  it('a name that won’t save claims nothing; the retry on the finish step claims once', async () => {
    save.mockRejectedValueOnce(new Error('We couldn’t save your name. Try again.'));
    const { result } = await signIn(member());
    expect(result.current.form.step).toBe('finish');
    expect(claim).not.toHaveBeenCalled();
    expect(storedInviteCode()).toBe('damilola-7k2x');
    await act(async () => result.current.form.onFinish!());
    await flush();
    expect(claim).toHaveBeenCalledTimes(1);
    expect(result.current.toast?.body).toContain('Damilola’s invite is saved.');
  });

  it('no invite this visit: nothing is claimed', async () => {
    sessionStorage.clear();
    const { result } = await signIn(member());
    expect(claim).not.toHaveBeenCalled();
    expect(result.current.toast?.body).toBe('Next, let’s find your first mentor…');
  });

  it('without the inviter’s name, the toast still says the invite is saved', async () => {
    const { result } = await signIn(member(), { inviteFrom: null });
    expect(result.current.toast?.body).toBe(
      'Your invite is saved. Next, let’s find your first mentor…',
    );
  });
});
