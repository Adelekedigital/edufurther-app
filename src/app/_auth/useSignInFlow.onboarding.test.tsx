import { act, renderHook } from '@testing-library/react';

// The onboarding flag is read when the config loads: on, before the flow imports it.
vi.stubEnv('NEXT_PUBLIC_ONBOARDING_V5_ENABLED', 'true');

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

let session: { status: string; userId?: string } = { status: 'none' };
vi.mock('@/lib/api/data/session', () => ({ useSession: () => session }));
vi.mock('@/lib/utils/useOnline', () => ({ useOnline: () => true }));

const send = vi.fn();
const verify = vi.fn();
const account = vi.fn();
vi.mock('@/lib/api/data/auth', () => ({
  sendSignInCode: (...a: unknown[]) => send(...a),
  verifySignInCode: (...a: unknown[]) => verify(...a),
  startGoogleSignIn: vi.fn(),
  signedInUser: vi.fn(),
  useSignOutHere: () => vi.fn(),
}));
vi.mock('@/lib/api/data/signIn', () => ({
  fetchSignInAccount: () => account(),
  useSaveName: () => ({ mutateAsync: vi.fn() }),
}));

const { useSignInFlow, TOAST_MS } = await import('./useSignInFlow');

/** A returning mentee whose onboarding /me reports unfinished (a migrated one, PRD H5). */
const unfinished = {
  kind: 'member',
  id: 'u1',
  firstName: 'Amara',
  isAdmin: false,
  isMentor: false,
  mentorApproved: false,
  onboardingComplete: false,
};

type Opts = Parameters<typeof useSignInFlow>[0];
const opts = (over: Partial<Opts> = {}): Opts => ({
  mode: 'login',
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
  [replace, send, verify, account].forEach((f) => f.mockReset());
  send.mockResolvedValue({ ok: true });
});
afterEach(() => vi.useRealTimers());
afterAll(() => vi.unstubAllEnvs());

describe('useSignInFlow — a mentee whose onboarding is unfinished', () => {
  it('signs in, says so, then opens onboarding', async () => {
    const { result } = renderHook(() => useSignInFlow(opts()));
    act(() => result.current.form.onEmailChange('amara@example.com'));
    await act(async () => result.current.form.onSendCode());
    verify.mockResolvedValueOnce({ ok: true });
    account.mockResolvedValueOnce(unfinished);
    await act(async () => result.current.form.onVerify!('482913'));
    await flush();
    expect(result.current.toast).toMatchObject({ body: 'Opening your setup…' });
    act(() => vi.advanceTimersByTime(TOAST_MS));
    expect(replace).toHaveBeenCalledWith('/onboarding');
  });

  it('already signed in: straight to onboarding, or to next when one was given', async () => {
    session = { status: 'present', userId: 'u1' };
    account.mockResolvedValueOnce(unfinished);
    const first = renderHook(() => useSignInFlow(opts()));
    await flush();
    expect(replace).toHaveBeenLastCalledWith('/onboarding');
    first.unmount();

    account.mockResolvedValueOnce(unfinished);
    renderHook(() => useSignInFlow(opts({ next: '/bookings' })));
    await flush();
    expect(replace).toHaveBeenLastCalledWith('/bookings');
  });
});
