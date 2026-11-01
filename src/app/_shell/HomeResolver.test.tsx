import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Viewer } from '@/types/mentor';
import { resetFlags, viewers } from './lockedPage.harness';

vi.mock('@/lib/config/auth', async (orig) =>
  (await import('@/app/_shell/lockedPage.harness')).authFlags(await orig()),
);
const h = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ replace: h.replace }),
}));
let viewer: Viewer = { kind: 'loading', signedIn: true };
vi.mock('@/lib/api/data/viewer', () => ({ useViewer: () => viewer }));

const { HomeResolver } = await import('./HomeResolver');

function resolve(v: Viewer) {
  viewer = v;
  return render(<HomeResolver />);
}

beforeEach(() => {
  h.replace.mockClear();
  resetFlags();
});

describe('HomeResolver: / when the server couldn’t tell who is signed in', () => {
  it('while /me loads: a neutral placeholder, nothing of either role, and no redirect yet', () => {
    for (const signedIn of [true, null]) {
      const { unmount } = resolve({ kind: 'loading', signedIn });
      expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
      unmount();
    }
    expect(h.replace).not.toHaveBeenCalled();
  });

  it('a mentor goes to the dashboard, never Explore (owner, 2026-11-01)', () => {
    resolve(viewers.mentorApproved);
    expect(h.replace).toHaveBeenCalledWith('/dashboard');
  });

  it('every member goes where sign-in would send them', () => {
    resolve(viewers.menteeFinished);
    expect(h.replace).toHaveBeenLastCalledWith('/home');
    resolve(viewers.mentorReview);
    expect(h.replace).toHaveBeenLastCalledWith('/mentor-application');
  });

  it('a guest, or a sign-in with no account to use: Explore, which explains', () => {
    for (const v of [
      { kind: 'guest' },
      { kind: 'unlinked' },
      { kind: 'accountExists' },
    ] as Viewer[]) {
      h.replace.mockClear();
      const { unmount } = resolve(v);
      expect(h.replace, v.kind).toHaveBeenCalledWith('/explore');
      unmount();
    }
  });

  it('a failed /me: says so with a way to try again, and goes nowhere', async () => {
    const retry = vi.fn();
    resolve({ kind: 'error', retry, retrying: false });
    expect(
      screen.getByRole('heading', { level: 1, name: 'We couldn’t open your home' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Check your connection and try again.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(h.replace).not.toHaveBeenCalled();
  });
});
