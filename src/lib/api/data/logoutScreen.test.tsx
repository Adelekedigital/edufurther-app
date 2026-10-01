import type { ReactNode } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SessionState } from '@/lib/vendor/supabase/browser';

// The real session store and the real Logout; only the SDK and the page load
// are stand-ins. Regression (product, 2026-10-01): the page redrew signed out
// ("Log in to manage your session types") before /login appeared.
let report: ((s: SessionState) => void) | null = null;
let finishSignOut: () => void = () => {};
vi.mock('@/lib/vendor/supabase/browser', () => ({
  sendEmailCode: vi.fn(),
  verifyEmailCode: vi.fn(),
  onSessionChange: (cb: (s: SessionState) => void) => {
    report = cb;
    cb({ status: 'present', userId: 'u1' });
    return () => {};
  },
  // Like the SDK: SIGNED_OUT fires at once, the call itself takes a while.
  signOut: () => {
    report!({ status: 'none' });
    return new Promise<void>((resolve) => {
      finishSignOut = resolve;
    });
  },
}));
const navigate = vi.fn();
vi.mock('@/lib/utils/hardNavigate', () => ({ hardNavigate: (p: string) => navigate(p) }));

const { useSession, SessionHintProvider } = await import('./session');
const { useSignOut } = await import('./auth');

function Screen() {
  const session = useSession();
  const signOut = useSignOut();
  return (
    <>
      <p>
        {session.status === 'present'
          ? 'Your session types'
          : 'Log in to manage your session types'}
      </p>
      <button type="button" onClick={() => void signOut()}>
        Logout
      </button>
    </>
  );
}
const wrapper = ({ children }: { children: ReactNode }) => (
  <SessionHintProvider hint={{ status: 'present', userId: 'u1' }}>{children}</SessionHintProvider>
);

describe('Logout on a signed-in screen', () => {
  it('the screen stays as it was, never signed out, until /login replaces it', async () => {
    render(<Screen />, { wrapper });
    expect(screen.getByText('Your session types')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Logout' }));
    // The SDK has reported SIGNED_OUT; sign-out is still in progress.
    expect(screen.getByText('Your session types')).toBeInTheDocument();
    expect(screen.queryByText('Log in to manage your session types')).toBeNull();
    expect(navigate).not.toHaveBeenCalled();

    await act(async () => finishSignOut());
    expect(navigate).toHaveBeenCalledWith('/login');
    expect(screen.getByText('Your session types')).toBeInTheDocument();
  });
});
