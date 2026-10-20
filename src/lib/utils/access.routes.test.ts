import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Viewer } from '@/types/mentor';
import { flags, resetFlags, viewers } from '@/app/_shell/lockedPage.harness';
import { isUnder, ROUTE_ROLES, routeRole, SHARED_ROUTES, wrongRoleHome } from './access';

// The flags, switchable per test (lockedPage.harness).
vi.mock('@/lib/config/auth', async (orig) =>
  (await import('@/app/_shell/lockedPage.harness')).authFlags(await orig()),
);

afterEach(resetFlags);

type Member = Extract<Viewer, { kind: 'member' }>;
/** A brand-new account: no goal, no mentor profile, nothing saved yet. */
const freshMentee: Member = {
  ...viewers.menteeUnfinished,
  isMentee: false,
  onboardingStarted: false,
  hasMentorProfile: false,
};

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
const MENTEE_PAGES = ['/home', '/onboarding/mentee'];
const SHARED_PAGES = [
  '/explore',
  '/bookings',
  '/settings',
  '/settings/profile',
  '/settings/booking',
  '/sessions/s1',
  '/mentors/ada-obi',
  '/onboarding',
  '/',
];

describe('wrongRoleHome: a page for the other role redirects (owner, 2026-10-20)', () => {
  const mentees = [
    ['a finished mentee', viewers.menteeFinished],
    ['an unfinished mentee', viewers.menteeUnfinished],
    ['a declined applicant who chose mentee', viewers.menteeByChoice],
    ['a fresh mentee (nothing saved yet)', freshMentee],
  ] as const;

  it.each(mentees)('%s on any mentor page goes to /home', (_who, v) => {
    for (const path of MENTOR_PAGES) expect(wrongRoleHome(v, path)).toBe('/home');
  });

  it.each(mentees)('%s stays on the mentee pages', (_who, v) => {
    for (const path of MENTEE_PAGES) expect(wrongRoleHome(v, path)).toBeNull();
  });

  it('a mentor on a mentee page goes to their own home', () => {
    for (const path of MENTEE_PAGES) {
      expect(wrongRoleHome(viewers.mentorApproved, path)).toBe('/dashboard');
      expect(wrongRoleHome(viewers.mentorReview, path)).toBe('/mentor-application');
      expect(wrongRoleHome(viewers.mentorDeclined, path)).toBe('/mentor-application');
      expect(wrongRoleHome(viewers.mentorApprovedUnseen, path)).toBe('/mentor-application');
      expect(wrongRoleHome(viewers.mentorUnfinished, path)).toBe('/onboarding/mentor');
    }
  });

  it('every mentor state stays on the mentor pages (the setup lock decides what shows)', () => {
    const mentors = [
      viewers.mentorApproved,
      viewers.mentorApprovedUnseen,
      viewers.mentorReview,
      viewers.mentorDeclined,
      viewers.mentorUnfinished,
      viewers.mentorSignup,
    ];
    for (const v of mentors)
      for (const path of MENTOR_PAGES) expect(wrongRoleHome(v, path)).toBeNull();
  });

  it('a mentor sign-up is mentor-side only while mentor onboarding is on', () => {
    expect(wrongRoleHome(viewers.mentorSignup, '/home')).toBe('/onboarding/mentor');
    expect(wrongRoleHome(viewers.mentorSignup, '/calendar')).toBeNull();
    flags.mentor = false;
    expect(wrongRoleHome(viewers.mentorSignup, '/home')).toBeNull();
    expect(wrongRoleHome(viewers.mentorSignup, '/calendar')).toBe('/home');
  });

  it('a fresh mentee can’t become a mentor by URL: /onboarding/mentor goes to /home', () => {
    expect(wrongRoleHome(freshMentee, '/onboarding/mentor')).toBe('/home');
  });

  it('shared pages and Explore are never redirected, for either role', () => {
    const all = [...Object.values(viewers), freshMentee];
    for (const v of all) for (const path of SHARED_PAGES) expect(wrongRoleHome(v, path)).toBeNull();
  });

  it('nothing redirects while /me loads, nor for a guest or an unusable account', () => {
    const others: Viewer[] = [
      { kind: 'loading', signedIn: true },
      { kind: 'loading', signedIn: null },
      { kind: 'guest' },
      { kind: 'unlinked' },
      { kind: 'accountExists' },
      { kind: 'error', retry: () => {}, retrying: false },
    ];
    for (const v of others)
      for (const path of [...MENTOR_PAGES, ...MENTEE_PAGES])
        expect(wrongRoleHome(v, path)).toBeNull();
  });

  it('never redirects onto another wrong-role page (no loops), flags on or off', () => {
    for (const mentor of [true, false]) {
      flags.mentor = mentor;
      for (const v of [...Object.values(viewers), freshMentee])
        for (const path of [...MENTOR_PAGES, ...MENTEE_PAGES]) {
          const to = wrongRoleHome(v, path);
          if (to) expect(wrongRoleHome(v, to)).toBeNull();
        }
    }
  });

  it('matches whole segments only', () => {
    expect(routeRole('/homework')).toBeNull();
    expect(routeRole('/onboarding/mentors')).toBeNull();
    expect(routeRole('/onboarding')).toBeNull();
    expect(isUnder('/anything', '/')).toBe(false);
  });
});

describe('every page has a role (ROUTE_ROLES) or is shared (SHARED_ROUTES)', () => {
  const appDir = join(__dirname, '..', '..', 'app');

  /** src/app/**\/page.tsx → its URL: route groups dropped, `api` and private folders skipped. */
  function pages(dir: string): string[] {
    const out: string[] = [];
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (e.name.startsWith('_') || (dir === appDir && e.name === 'api')) continue;
        out.push(...pages(join(dir, e.name)));
      } else if (e.name === 'page.tsx') {
        const segs = relative(appDir, dir)
          .split(sep)
          .filter((s) => s && !/^\(.*\)$/.test(s));
        out.push(`/${segs.join('/')}`);
      }
    }
    return out;
  }

  it('finds the pages (the walk itself works)', () => {
    expect(pages(appDir)).toEqual(expect.arrayContaining(['/', '/calendar', '/settings/[tab]']));
  });

  it.each(pages(appDir))('%s is classified', (path) => {
    const roled = routeRole(path) !== null;
    const shared = SHARED_ROUTES.some((r) => isUnder(path, r));
    // A role's entry wins over a shared parent (/onboarding/mentor under /onboarding).
    expect(roled || shared).toBe(true);
  });

  it('no listed route is stale', () => {
    const all = pages(appDir);
    for (const r of [...Object.keys(ROUTE_ROLES), ...SHARED_ROUTES])
      expect(all.some((p) => isUnder(p, r))).toBe(true);
  });
});
