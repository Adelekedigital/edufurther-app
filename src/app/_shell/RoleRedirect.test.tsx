import { render, screen } from '@testing-library/react';
import type { Viewer } from '@/types/mentor';
import { flags, resetFlags, viewers } from './lockedPage.harness';

// The flags, switchable per test (lockedPage.harness).
vi.mock('@/lib/config/auth', async (orig) =>
  (await import('@/app/_shell/lockedPage.harness')).authFlags(await orig()),
);
const h = vi.hoisted(() => ({ pathname: '/calendar', replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => h.pathname,
  useRouter: () => ({ replace: h.replace }),
}));
let viewer: Viewer = { kind: 'loading', signedIn: true };
vi.mock('@/lib/api/data/viewer', () => ({
  useViewer: () => viewer,
  keepMockViewer: (href: string) => href,
}));
// No PATCH may ever leave a role page a member was redirected from.
const patch = vi.fn();
vi.mock('@/lib/api/data/http', () => ({ api: { PATCH: patch, GET: vi.fn() } }));
// The real onboarding pages, their screens stubbed: only the wrapper is under test.
vi.mock('@/app/onboarding/mentor/_components/MentorOnboardingScreen', () => ({
  MentorOnboardingScreen: () => <h1>Mentor steps</h1>,
}));
vi.mock('@/app/onboarding/_components/OnboardingScreen', () => ({
  OnboardingScreen: () => <h1>Mentee steps</h1>,
}));

const { RoleRedirect } = await import('./RoleRedirect');

function page(path: string, v: Viewer) {
  h.pathname = path;
  viewer = v;
  return render(
    <RoleRedirect>
      <h1>The page</h1>
    </RoleRedirect>,
  );
}

beforeEach(() => {
  h.replace.mockClear();
  patch.mockClear();
  resetFlags();
});

const MENTOR_PAGES = [
  '/dashboard',
  '/calendar',
  '/integrations',
  '/session-types',
  '/session-types/new',
  '/session-types/st1/edit',
  '/mentor-application',
  '/onboarding/mentor',
];

describe('RoleRedirect: the other role’s page never shows (owner, 2026-10-20)', () => {
  it.each(MENTOR_PAGES)('a mentee on %s goes to /home, with nothing of the page', (path) => {
    for (const v of [viewers.menteeFinished, viewers.menteeUnfinished, viewers.menteeByChoice]) {
      const { unmount } = page(path, v);
      expect(h.replace).toHaveBeenLastCalledWith('/home');
      expect(screen.queryByRole('heading', { name: 'The page' })).toBeNull();
      unmount();
    }
  });

  it.each(['/home', '/onboarding/mentee'])('a mentor on %s goes to their own home', (path) => {
    page(path, viewers.mentorApproved);
    expect(h.replace).toHaveBeenLastCalledWith('/dashboard');
    expect(screen.queryByRole('heading', { name: 'The page' })).toBeNull();
    h.replace.mockClear();
    page(path, viewers.mentorReview);
    expect(h.replace).toHaveBeenLastCalledWith('/mentor-application');
  });

  it('an unsubmitted mentor on /calendar stays: the page shows its setup lock', () => {
    page('/calendar', viewers.mentorUnfinished);
    expect(h.replace).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'The page' })).toBeInTheDocument();
  });

  it('a mentor sign-up reaches mentor onboarding with the flag on, and is a mentee with it off', () => {
    page('/onboarding/mentor', viewers.mentorSignup);
    expect(h.replace).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'The page' })).toBeInTheDocument();
    flags.mentor = false;
    page('/calendar', viewers.mentorSignup);
    expect(h.replace).toHaveBeenLastCalledWith('/home');
  });

  it.each(['/explore', '/bookings', '/settings/profile', '/sessions/s1', '/mentors/ada-obi'])(
    '%s is shared: never redirected, for either role',
    (path) => {
      for (const v of [viewers.menteeFinished, viewers.mentorApproved]) {
        const { unmount } = page(path, v);
        expect(h.replace).not.toHaveBeenCalled();
        expect(screen.getByRole('heading', { name: 'The page' })).toBeInTheDocument();
        unmount();
      }
    },
  );

  it('while /me loads, and for a guest: no redirect, the page’s own gates', () => {
    for (const v of [{ kind: 'loading', signedIn: true }, { kind: 'guest' }] as Viewer[]) {
      const { unmount } = page('/calendar', v);
      expect(h.replace).not.toHaveBeenCalled();
      expect(screen.getByRole('heading', { name: 'The page' })).toBeInTheDocument();
      unmount();
    }
  });
});

describe('the onboarding pages outside the shell', () => {
  /** A fresh sign-up: no goal, no mentor profile, nothing saved. */
  const fresh = { ...viewers.menteeUnfinished, isMentee: false, onboardingStarted: false };

  it('a fresh mentee on /onboarding/mentor goes to /home (the query never counts); nothing is saved', async () => {
    const { default: MentorOnboardingPage } = await import('@/app/onboarding/mentor/page');
    h.pathname = '/onboarding/mentor';
    viewer = fresh;
    render(<MentorOnboardingPage />);
    expect(h.replace).toHaveBeenLastCalledWith('/home');
    expect(screen.queryByRole('heading', { name: 'Mentor steps' })).toBeNull();
    expect(patch).not.toHaveBeenCalled();
  });

  it('a mentor sign-up still reaches mentor onboarding', async () => {
    const { default: MentorOnboardingPage } = await import('@/app/onboarding/mentor/page');
    h.pathname = '/onboarding/mentor';
    viewer = viewers.mentorSignup;
    render(<MentorOnboardingPage />);
    expect(h.replace).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Mentor steps' })).toBeInTheDocument();
  });

  it('an approved mentor on /onboarding/mentee goes to the dashboard, never the mentee steps', async () => {
    const { default: MenteeOnboardingPage } = await import('@/app/onboarding/mentee/page');
    h.pathname = '/onboarding/mentee';
    viewer = viewers.mentorApproved;
    render(<MenteeOnboardingPage />);
    expect(h.replace).toHaveBeenLastCalledWith('/dashboard');
    expect(screen.queryByRole('heading', { name: 'Mentee steps' })).toBeNull();
  });
});
