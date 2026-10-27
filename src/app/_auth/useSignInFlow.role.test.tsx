import { act, renderHook } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { keys } from '@/lib/api/data/keys';
import type { Viewer } from '@/types/mentor';

// The role is set at sign-up only (owner, 2026-10-20). Both flags are read
// when the config loads: on, before the flow imports it.
vi.stubEnv('NEXT_PUBLIC_ONBOARDING_ENABLED', 'true');
vi.stubEnv('NEXT_PUBLIC_MENTOR_ONBOARDING_ENABLED', 'true');

const replace = vi.fn();
const qc = new QueryClient();
vi.mock('@tanstack/react-query', async (orig) => ({
  ...(await orig<typeof import('@tanstack/react-query')>()),
  useQueryClient: () => qc,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

let session: { status: string; userId?: string } = { status: 'none' };
vi.mock('@/lib/api/data/session', () => ({ useSession: () => session }));
vi.mock('@/lib/utils/useOnline', () => ({ useOnline: () => true }));

const verify = vi.fn();
const account = vi.fn();
const user = vi.fn();
const saveName = vi.fn();
vi.mock('@/lib/api/data/auth', () => ({
  sendSignInCode: () => Promise.resolve({ ok: true }),
  verifySignInCode: (...a: unknown[]) => verify(...a),
  startGoogleSignIn: vi.fn(),
  signedInUser: () => user(),
  useSignOutHere: () => vi.fn(),
}));
vi.mock('@/lib/api/data/signIn', () => ({
  fetchSignInAccount: () => account(),
  useSaveName: () => ({ mutateAsync: (v: unknown) => saveName(v) }),
  zoneToSave: () => undefined,
}));
const saveRole = vi.fn();
vi.mock('@/lib/api/data/roles', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/data/roles')>()),
  savePrimaryRole: (...a: unknown[]) => saveRole(...a),
}));

const { useSignInFlow, TOAST_MS, ROLE_SAVE_FAILED } = await import('./useSignInFlow');
const { onboardingDestination } = await import('@/app/onboarding/_components/OnboardingEntry');

/** A brand-new account (never named): no goal, no mentor profile. */
const fresh = (over: object = {}) => ({
  kind: 'member',
  id: 'u1',
  firstName: null,
  isMentor: false,
  mentorApproved: false,
  signedUpAsMentor: false,
  hasMentorProfile: false,
  ...over,
});

type Opts = Parameters<typeof useSignInFlow>[0];
const opts = (over: Partial<Opts> = {}): Opts => ({
  mode: 'signup',
  role: 'mentor',
  next: null,
  googleReturn: false,
  googleFailed: false,
  ...over,
});

async function flush() {
  for (let i = 0; i < 4; i++)
    await act(async () => {
      await Promise.resolve();
    });
}

/** Sign up by code with a typed name, up to the account read. */
async function byCode(over: Partial<Opts> = {}) {
  const hook = renderHook((o: Opts) => useSignInFlow(o), { initialProps: opts(over) });
  act(() => {
    hook.result.current.form.onEmailChange('gbenga@example.com');
    hook.result.current.form.onFullNameChange('Gbenga Ekundayo');
  });
  await act(async () => hook.result.current.form.onSendCode());
  verify.mockResolvedValueOnce({ ok: true });
  await act(async () => hook.result.current.form.onVerify!('482913'));
  await flush();
  return hook;
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  session = { status: 'none' };
  [replace, verify, account, user, saveName, saveRole].forEach((f) => f.mockReset());
  saveName.mockResolvedValue(undefined);
  saveRole.mockResolvedValue(undefined);
  qc.clear();
  window.sessionStorage.clear();
  window.localStorage.clear();
});
afterEach(() => vi.useRealTimers());

describe('useSignInFlow: the mentor role, saved at sign-up', () => {
  it('a new role=mentor sign-up by code: saved once, then the mentor toast and destination', async () => {
    account.mockResolvedValueOnce(fresh());
    const { result } = await byCode();
    expect(saveRole).toHaveBeenCalledTimes(1);
    expect(saveRole).toHaveBeenCalledWith('u1', 'mentor');
    expect(result.current.toast).toMatchObject({
      body: 'Opening your mentor application…',
      href: '/onboarding?role=mentor',
    });
    act(() => vi.advanceTimersByTime(TOAST_MS));
    expect(replace).toHaveBeenCalledWith('/onboarding?role=mentor');
  });

  it('a new role=mentor sign-up with Google: saved once', async () => {
    session = { status: 'present', userId: 'u1' };
    account.mockResolvedValueOnce(fresh());
    user.mockResolvedValue({
      email: 'gbenga@example.com',
      givenName: 'Gbenga',
      familyName: 'Ekundayo',
      fullName: 'Gbenga Ekundayo',
      googleJustLinked: false,
    });
    const { result } = renderHook(() => useSignInFlow(opts({ googleReturn: true })));
    await flush();
    expect(saveRole).toHaveBeenCalledTimes(1);
    expect(result.current.toast).toMatchObject({ body: 'Opening your mentor application…' });
  });

  it.each([
    ['a returning account', fresh({ firstName: 'Ada' })],
    ['an account with a mentor profile', fresh({ hasMentorProfile: true })],
    ['an account already remembered as a mentor', fresh({ signedUpAsMentor: true })],
  ])('never for %s', async (_who, acct) => {
    account.mockResolvedValueOnce(acct);
    await byCode();
    expect(saveRole).not.toHaveBeenCalled();
  });

  it('never for a mentee sign-up, nor at log-in', async () => {
    account.mockResolvedValueOnce(fresh());
    await byCode({ role: 'mentee' });
    account.mockResolvedValueOnce(fresh());
    await byCode({ mode: 'login' });
    expect(saveRole).not.toHaveBeenCalled();
  });

  it('a /me cached before the save already says mentor, so /onboarding opens mentor onboarding', async () => {
    const cached: Viewer = {
      kind: 'member',
      id: 'u1',
      firstName: 'Gbenga',
      initials: 'GE',
      isMentee: false,
      isApprovedMentor: false,
      isMentor: false,
      signedUpAsMentor: false,
      completedSessions: 0,
      credits: null,
    };
    qc.setQueryData(keys.viewer.me('u1'), cached);
    account.mockResolvedValueOnce(fresh());
    await byCode();
    const v = qc.getQueryData<Viewer>(keys.viewer.me('u1'))!;
    expect(onboardingDestination(v, new URLSearchParams('role=mentor'))).toBe(
      '/onboarding/mentor?role=mentor',
    );
  });

  it('a failed save stops on the finish step with a retry, and never routes as a mentee', async () => {
    account.mockResolvedValueOnce(fresh());
    saveRole.mockRejectedValueOnce(new Error('nope'));
    const { result } = await byCode();
    expect(result.current.form.step).toBe('finish');
    expect(result.current.form.roleError).toBe(ROLE_SAVE_FAILED);
    expect(result.current.form.roleError).toBe(
      'We couldn’t save that you’re joining as a mentor. Try again.',
    );
    expect(result.current.toast).toBeNull();
    act(() => vi.advanceTimersByTime(TOAST_MS * 2));
    expect(replace).not.toHaveBeenCalled();

    // Create account tries the role again; the name, already saved, isn't resent.
    await act(async () => result.current.form.onFinish!());
    await flush();
    expect(saveRole).toHaveBeenCalledTimes(2);
    expect(saveName).toHaveBeenCalledTimes(1);
    expect(result.current.form.roleError).toBeUndefined();
    expect(result.current.toast).toMatchObject({ body: 'Opening your mentor application…' });
  });

  it('a Google sign-up whose role won’t save keeps Google’s name in the finish step', async () => {
    session = { status: 'present', userId: 'u1' };
    account.mockResolvedValueOnce(fresh());
    saveRole.mockRejectedValueOnce(new Error('nope'));
    user.mockResolvedValue({
      email: 'gbenga@example.com',
      givenName: 'Gbenga',
      familyName: 'Ekundayo',
      fullName: 'Gbenga Ekundayo',
      googleJustLinked: false,
    });
    const { result } = renderHook(() => useSignInFlow(opts({ googleReturn: true })));
    await flush();
    expect(result.current.form.step).toBe('finish');
    expect(result.current.form.fullName).toBe('Gbenga Ekundayo');
    expect(result.current.form.roleError).toBe(ROLE_SAVE_FAILED);
  });
});
