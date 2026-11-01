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
}));
// No PATCH may ever leave a role page a member was redirected from.
const patch = vi.fn();
vi.mock('@/lib/api/data/http', () => ({ api: { PATCH: patch, GET: vi.fn() } }));
// The landing hint goes to this app's server; only what is asked for is checked.
const saveLandingHint = vi.fn();
vi.mock('@/lib/api/data/landingHint', () => ({ saveLandingHint }));
// The Supabase session the hint is bound to.
vi.mock('@/lib/api/data/session', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/data/session')>()),
  useSession: () => ({ status: 'present', userId: 'sub-1' }),
}));
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
  it.each(MENTOR_PAGES)('a mentee on %s goes to their home, with nothing of the page', (path) => {
    const cases = [
      [viewers.menteeFinished, '/home'],
      [viewers.menteeUnfinished, '/onboarding'],
      [viewers.menteeByChoice, '/home'],
    ] as const;
    for (const [v, home] of cases) {
      const { unmount } = page(path, v);
      expect(h.replace).toHaveBeenLastCalledWith(home);
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

  it('while /me loads on a role’s page: no redirect, and a neutral skeleton, not the page', () => {
    for (const path of ['/calendar', '/home', '/onboarding/mentor']) {
      for (const signedIn of [true, null]) {
        const { unmount } = page(path, { kind: 'loading', signedIn });
        expect(h.replace).not.toHaveBeenCalled();
        expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
        expect(screen.queryByRole('heading')).toBeNull();
        unmount();
      }
    }
  });

  it('while /me loads on a shared page, and for a guest anywhere: the page as it is', () => {
    const cases: [string, Viewer][] = [
      ['/bookings', { kind: 'loading', signedIn: true }],
      ['/calendar', { kind: 'guest' }],
      ['/home', { kind: 'guest' }],
    ];
    for (const [path, v] of cases) {
      const { unmount } = page(path, v);
      expect(h.replace).not.toHaveBeenCalled();
      expect(screen.getByRole('heading', { name: 'The page' })).toBeInTheDocument();
      expect(screen.queryByRole('status', { name: 'Loading' })).toBeNull();
      unmount();
    }
  });
});

describe('the onboarding pages outside the shell', () => {
  /** A fresh sign-up: no goal, no mentor profile, nothing saved. */
  const fresh = { ...viewers.menteeUnfinished, isMentee: false, onboardingStarted: false };

  it('a fresh mentee on /onboarding/mentor goes to their onboarding (the query never counts); nothing is saved', async () => {
    const { default: MentorOnboardingPage } = await import('@/app/onboarding/mentor/page');
    h.pathname = '/onboarding/mentor';
    viewer = fresh;
    render(<MentorOnboardingPage />);
    expect(h.replace).toHaveBeenLastCalledWith('/onboarding');
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

describe('RoleRedirect: the landing hint the proxy reads (owner, 2026-11-01)', () => {
  const chose = () => document.cookie.includes('ef-chose-explore=sub-1');
  beforeEach(() => {
    saveLandingHint.mockClear();
    document.cookie = 'ef-chose-explore=; path=/; max-age=0';
  });

  it('a mentor: their own home, for the Supabase user signed in', () => {
    page('/calendar', viewers.mentorApproved);
    expect(saveLandingHint).toHaveBeenLastCalledWith('sub-1', '/dashboard');
  });

  it('a mentee, or an account that can’t be used: cleared, so Explore and its notices reach them', () => {
    for (const v of [
      viewers.menteeFinished,
      { kind: 'unlinked' },
      { kind: 'accountExists' },
    ] as Viewer[]) {
      saveLandingHint.mockClear();
      page('/explore', v).unmount();
      expect(saveLandingHint, v.kind).toHaveBeenCalledWith('sub-1', null);
    }
  });

  it('while /me loads or failed, or for a guest: left as it is', () => {
    page('/explore', { kind: 'loading', signedIn: true }).unmount();
    page('/explore', { kind: 'error', retry: () => {}, retrying: false }).unmount();
    page('/explore', { kind: 'guest' });
    expect(saveLandingHint).not.toHaveBeenCalled();
  });

  it('a mentor with Explore on screen chose it: marked with their own user, for this browser session', () => {
    page('/explore', viewers.mentorApproved);
    expect(chose()).toBe(true);
  });

  it('never marked for a mentee, or for a mentor elsewhere', () => {
    page('/explore', viewers.menteeFinished).unmount();
    page('/calendar', viewers.mentorApproved);
    expect(chose()).toBe(false);
  });
});
