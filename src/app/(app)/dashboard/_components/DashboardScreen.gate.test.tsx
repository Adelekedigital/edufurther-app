import { render, screen } from '@testing-library/react';
import type { Viewer } from '@/types/mentor';
import { flags, resetFlags, viewers } from '@/app/_shell/lockedPage.harness';
import { DashboardScreen } from './DashboardScreen';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
// The setup lock's flags, switchable per test (lockedPage.harness).
vi.mock('@/lib/config/auth', async (orig) =>
  (await import('@/app/_shell/lockedPage.harness')).authFlags(await orig()),
);
let viewer: Viewer;
vi.mock('@/lib/api/data/viewer', () => ({ useViewer: () => viewer }));
vi.mock('@/app/_shell/useAppShell', () => ({
  useAppShell: () => ({
    member: viewer.kind === 'member' ? viewer : null,
    chrome: viewer.kind === 'loading' ? 'pending' : 'member',
  }),
}));
// The dashboard itself is not under test here: only whether it is reached
// (it then shows its own loading).
const dashboard = vi.fn(() => ({ error: null, isLoading: true, data: null, retry: vi.fn() }));
vi.mock('@/lib/api/data/dashboard', () => ({ useMentorDashboard: () => dashboard() }));
vi.mock('./ApprovedToast', () => ({ ApprovedToast: () => null }));

beforeEach(() => {
  replace.mockReset();
  dashboard.mockClear();
  resetFlags();
});

describe('/dashboard and the setup lock (owner, 2026-10-20)', () => {
  it('a mentor who never sent their application goes to mentor onboarding, not the dashboard', () => {
    viewer = viewers.mentorUnfinished;
    render(<DashboardScreen />);
    expect(replace).toHaveBeenCalledWith('/onboarding/mentor');
    expect(replace).not.toHaveBeenCalledWith('/');
    expect(dashboard).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Loading your dashboard');
  });

  it('a mentor sign-up who hasn’t started goes to mentor onboarding too', () => {
    viewer = viewers.mentorSignup;
    render(<DashboardScreen />);
    expect(replace).toHaveBeenCalledWith('/onboarding/mentor');
    expect(replace).not.toHaveBeenCalledWith('/');
  });

  it('with mentor onboarding off, nobody is sent to it', () => {
    flags.mentor = false;
    viewer = viewers.mentorUnfinished;
    render(<DashboardScreen />);
    expect(dashboard).toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalledWith('/onboarding/mentor');
  });

  it.each([
    ['a mentor in review', viewers.mentorReview],
    ['an approved mentor', viewers.mentorApproved],
  ])('%s reaches the dashboard', (_who, v) => {
    viewer = v;
    render(<DashboardScreen />);
    expect(dashboard).toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
