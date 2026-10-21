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
vi.mock('@/app/_shell/useAppShell', () => ({
  useAppShell: () => ({
    viewer,
    member: viewer.kind === 'member' ? viewer : null,
    chrome: viewer.kind === 'loading' ? 'pending' : 'member',
  }),
}));
// The dashboard itself is not under test here: only whether it is reached
// (it then shows its own loading).
const dashboard = vi.fn(() => ({ error: null, isLoading: true, data: null, retry: vi.fn() }));
vi.mock('@/lib/api/data/dashboard', () => ({ useMentorDashboard: () => dashboard() }));
// The reconnect banner fetches the calendar connection (PRD decision 5).
// Mocked at the data layer, as this file mocks every other one, so the
// screen's own wiring of the banner stays under test.
// The banner also asks whether bookings are possible at all, so it never
// claims "times you're busy can still be booked" to a paused or unlisted
// mentor. Listed and not paused here: these tests are about the gate.
vi.mock('@/lib/api/data/mentorStatus', () => ({
  useMentorStatus: () => ({
    data: { approved: true, listed: true, pausedByMentor: false, returnOn: null },
    isLoading: false,
    error: null,
    retry: vi.fn(),
  }),
}));
vi.mock('@/lib/api/data/calendarConnection', () => ({
  useCalendarConnection: () => ({ data: null, isLoading: false, error: null, retry: vi.fn() }),
  readCalendarConnection: vi.fn(),
  useStartCalendarConnect: () => ({ start: vi.fn() }),
  useDisconnectCalendar: () => ({
    disconnect: vi.fn(),
    isPending: false,
    error: null,
    reset: vi.fn(),
  }),
  useRefreshAfterConnect: () => vi.fn(),
}));
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
