import { render, screen } from '@testing-library/react';
import type { WeeklyHours } from '@/lib/api/data/weeklyHours';
import type { AppError } from '@/types/mentor';
import { CalendarScreen } from './CalendarScreen';
import { h, mentor, remote, resetCalendar } from './calendarScreen.harness';
import {
  expectLockedPage,
  expectNoLock,
  explainer,
  flags,
  viewers,
} from '@/app/_shell/lockedPage.harness';

// The data hooks, mocked (hoisted above the imports; state lives in the harness).
vi.mock('next/navigation', async () =>
  (await import('./calendarScreen.harness')).mocks.navigation(),
);
// The setup lock's flags, switchable per test (lockedPage.harness).
vi.mock('@/lib/config/auth', async (orig) =>
  (await import('@/app/_shell/lockedPage.harness')).authFlags(await orig()),
);
vi.mock('@/app/_shell/useAppShell', async () =>
  (await import('./calendarScreen.harness')).mocks.appShell(),
);
vi.mock('@/lib/api/data/weeklyHours', async () =>
  (await import('./calendarScreen.harness')).mocks.weeklyHours(),
);
vi.mock('@/lib/api/data/sessionTypes', async () =>
  (await import('./calendarScreen.harness')).mocks.sessionTypes(),
);
vi.mock('@/lib/api/data/mentorStatus', async () =>
  (await import('./calendarScreen.harness')).mocks.mentorStatus(),
);
vi.mock('@/lib/api/data/conferencing', async () =>
  (await import('./calendarScreen.harness')).mocks.conferencing(),
);
vi.mock('@/lib/api/data/calendar', async () =>
  (await import('./calendarScreen.harness')).mocks.calendar(),
);

vi.mock('@/lib/api/data/calendarConnection', async () =>
  (await import('./calendarScreen.harness')).mocks.calendarConnection(),
);

beforeEach(resetCalendar);

describe('the setup lock: /calendar opened by URL (PRD "App shell and access")', () => {
  const declined = () => mentor({ isApprovedMentor: false, mentorStage: 'declined' });

  it('a declined mentor gets the explainer as the page, not the calendar', () => {
    h.viewer = declined();
    render(<CalendarScreen />);
    expectLockedPage(explainer.mentorNotApproved('Calendar'));
    expect(screen.queryByRole('heading', { name: 'Your calendar' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Weekly availability' })).toBeNull();
  });

  it('a mentor who never sent their application gets the setup explainer (owner, 2026-10-20)', () => {
    h.viewer = viewers.mentorUnfinished;
    render(<CalendarScreen />);
    expectLockedPage(explainer.mentorSetup('Calendar'));
    expect(screen.queryByRole('heading', { name: 'Weekly availability' })).toBeNull();
  });

  it('a declined mentor is locked even while the hours are loading or have failed', () => {
    h.viewer = declined();
    h.weekly = remote<WeeklyHours>(null, { isLoading: true });
    const { unmount } = render(<CalendarScreen />);
    expectLockedPage(explainer.mentorNotApproved('Calendar'));
    unmount();
    h.weekly = remote<WeeklyHours>(null, { error: { kind: 'server', message: 'x' } as AppError });
    render(<CalendarScreen />);
    expectLockedPage(explainer.mentorNotApproved('Calendar'));
  });

  it.each([
    [
      'a mentor in review (only Bookings locks)',
      { isApprovedMentor: false, mentorStage: 'pending' },
    ],
    ['an approved mentor', { mentorStage: 'approved', mentorApprovedSeen: true }],
    [
      'an approved mentor who hasn’t seen the approved screen',
      { mentorStage: 'approved', mentorApprovedSeen: false },
    ],
  ] as const)('%s sets their hours', (_who, over) => {
    h.viewer = mentor(over);
    render(<CalendarScreen />);
    expect(screen.getByRole('heading', { name: 'Weekly availability' })).toBeInTheDocument();
    expectNoLock();
  });

  // A mentee never reaches the screen: the layout redirects them (RoleRedirect.test).
  it.each([
    ['a mentor sign-up, not started', viewers.mentorSignup, explainer.mentorSetup('Calendar')],
    [
      'a mentor who never sent their application',
      viewers.mentorUnfinished,
      explainer.mentorSetup('Calendar'),
    ],
  ])('%s gets the setup explainer', (_who, v, e) => {
    h.viewer = v;
    render(<CalendarScreen />);
    expectLockedPage(e);
  });

  it('while /me loads: the page’s loading state, no explainer', () => {
    h.viewer = { kind: 'loading', signedIn: true };
    render(<CalendarScreen />);
    expect(screen.getByRole('status', { name: 'Loading your calendar' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Weekly availability' })).toBeNull();
    expectNoLock();
  });

  it('mentor onboarding switched off: a declined mentor isn’t locked', () => {
    flags.mentor = false;
    h.viewer = declined();
    render(<CalendarScreen />);
    expect(screen.getByRole('heading', { name: 'Weekly availability' })).toBeInTheDocument();
    expectNoLock();
  });
});
