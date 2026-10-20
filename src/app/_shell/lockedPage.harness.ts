/**
 * Shared test harness for the locked pages (PRD "App shell and access"): the
 * explainer each setup state should get. The viewers and the flags live in
 * test-utils/roles (re-exported here); each page's test file registers the
 * mocks itself (Vitest hoists `vi.mock`), reaching this file through a
 * dynamic import.
 */
import { screen } from '@testing-library/react';

export { authFlags, flags, resetFlags, viewers } from '@/test-utils/roles';

/** The explainer's words per state, typed out here so the copy is pinned. */
export const explainer = {
  menteeSetup: (item: string) => ({
    title: `Finish setting up to use ${item}`,
    cta: 'Continue setup',
    href: '/onboarding',
  }),
  mentorSetup: (item: string) => ({
    title: `Finish setting up to use ${item}`,
    cta: 'Continue setup',
    href: '/onboarding/mentor',
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
