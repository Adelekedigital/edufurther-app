/**
 * Shared test harness for the locked pages (PRD "App shell and access"): the
 * viewers in each setup state, the explainer each one should get, and the
 * feature flags as switches. Each page's test file registers the mocks itself
 * (Vitest hoists `vi.mock`), reaching this file through a dynamic import.
 */
import { screen } from '@testing-library/react';
import type * as Auth from '@/lib/config/auth';
import type { Viewer } from '@/types/mentor';

type Member = Extract<Viewer, { kind: 'member' }>;

/** Both setup pages switched on; a test flips one off to pin "no page, no lock". */
export const flags = { onboarding: true, mentor: true };

export function resetFlags() {
  flags.onboarding = true;
  flags.mentor = true;
}

/** `@/lib/config/auth` with the two flags read live from `flags`. */
export function authFlags(real: typeof Auth) {
  return {
    ...real,
    get ONBOARDING_LIVE() {
      return flags.onboarding;
    },
    get MENTOR_ONBOARDING_LIVE() {
      return flags.mentor;
    },
  };
}

const base: Member = {
  kind: 'member',
  id: 'me',
  firstName: 'Ada',
  initials: 'A',
  isMentee: false,
  isApprovedMentor: false,
  isMentor: false,
  completedSessions: 0,
  credits: null,
  timeZone: 'Africa/Lagos',
};

/** The viewers B's dev mocks stand for, plus the edge cases that never lock. */
export const viewers = {
  menteeUnfinished: { ...base, isMentee: true, onboardingComplete: false },
  menteeFinished: { ...base, isMentee: true, onboardingComplete: true },
  /** Declined, chose mentee: toViewer maps them to isMentor false, stage none. */
  menteeByChoice: { ...base, isMentee: true, mentorStage: 'none', onboardingComplete: true },
  mentorReview: { ...base, isMentor: true, mentorStage: 'pending' },
  mentorDeclined: { ...base, isMentor: true, mentorStage: 'declined' },
  mentorApproved: {
    ...base,
    isMentor: true,
    isApprovedMentor: true,
    mentorStage: 'approved',
    mentorApprovedSeen: true,
  },
  /** Approved, approved_seen_at still null: /mentor-application links on to the pages. */
  mentorApprovedUnseen: {
    ...base,
    isMentor: true,
    isApprovedMentor: true,
    mentorStage: 'approved',
    mentorApprovedSeen: false,
  },
} satisfies Record<string, Member>;

/** The explainer's words per state, typed out here so the copy is pinned. */
export const explainer = {
  menteeSetup: (item: string) => ({
    title: `Finish setting up to use ${item}`,
    cta: 'Continue setup',
    href: '/onboarding',
  }),
  mentorReview: (item: string) => ({
    title: `${item} opens once you’re approved`,
    cta: 'See application status',
    href: '/mentor-application',
  }),
  mentorNotApproved: (item: string) => ({
    title: `${item} isn’t available`,
    cta: 'See your result',
    href: '/mentor-application',
  }),
};

/** The explainer is the page: its title is the h1, and its CTA the one control. */
export function expectLockedPage(e: { title: string; cta: string; href: string }) {
  expect(screen.getByRole('heading', { level: 1, name: e.title })).toBeInTheDocument();
  const links = screen.getAllByRole('link');
  expect(links).toHaveLength(1);
  expect(links[0]).toHaveAccessibleName(e.cta);
  expect(links[0]).toHaveAttribute('href', e.href);
  // One button only: no "Not now" on a page.
  expect(screen.queryAllByRole('button')).toHaveLength(0);
}

/** No lock explainer anywhere on the page, whatever the state's words. */
export function expectNoLock() {
  const lockTitle = /^Finish setting up to use |opens once you’re approved$| isn’t available$/;
  const titles = screen.queryAllByRole('heading').map((el) => el.textContent ?? '');
  expect(titles.filter((t) => lockTitle.test(t))).toEqual([]);
  expect(
    screen.queryByRole('link', {
      name: /^(Continue setup|See application status|See your result)$/,
    }),
  ).toBeNull();
}
