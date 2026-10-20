import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Viewer } from '@/types/mentor';
import type { Access } from '@/lib/utils/access';
import { AppShell } from './AppShell';

// Both pages switched on, before access.ts reads them.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_ONBOARDING_ENABLED = 'true';
  process.env.NEXT_PUBLIC_MENTOR_ONBOARDING_ENABLED = 'true';
});
const { accessFor } = await import('@/lib/utils/access');

type Member = Extract<Viewer, { kind: 'member' }>;
const member = (over: Partial<Member>): Member => ({
  kind: 'member',
  id: 'u1',
  firstName: 'Ada',
  initials: 'A',
  isMentee: true,
  isApprovedMentor: false,
  isMentor: false,
  completedSessions: 0,
  credits: null,
  ...over,
});
const SETUP = accessFor(member({ onboardingComplete: false }));
const REVIEW = accessFor(member({ isMentor: true, mentorStage: 'pending' }));
const DECLINED = accessFor(member({ isMentor: true, mentorStage: 'declined' }));

const AV = { initial: 'A', cover: 'sky' as const };
const BOOKINGS = { Bookings: { count: 2, label: '2 requests awaiting the mentor' } };
const shell = (
  access: Access,
  nav: 'mentee' | 'mentor' | 'unknown' = 'mentee',
  active = 'Explore',
) =>
  render(
    <AppShell
      active={active}
      nav={nav}
      chrome="member"
      offline={false}
      access={access}
      account={{ avatar: AV, items: [], counts: BOOKINGS }}
    >
      <p>Page</p>
    </AppShell>,
  );
// Two "Main" navs: the rail (≥768px) first, the bottom tabs (<768px) second.
const nav = (i: 0 | 1) => within(screen.getAllByRole('navigation', { name: 'Main' })[i]!);

describe('AppShell: the setup lock (AppShell.dc.html setupLock)', () => {
  it('menteeSetup: Bookings is a locked button on the rail and the tab, with its reason as its name', () => {
    shell(SETUP);
    for (const i of [0, 1] as const) {
      const b = nav(i).getByRole('button', {
        name: 'Bookings, locked until you finish setting up',
      });
      expect(b).toHaveAttribute('aria-haspopup', 'dialog');
      // The lock badge, and no count badge (design `hasCount: false`).
      expect(b.querySelector('[class*="lockBadge"]')).toHaveTextContent('lock');
      expect(b.querySelector('[class*="badge"]:not([class*="lockBadge"])')).toBeNull();
      expect(nav(i).queryByRole('link', { name: /Bookings/ })).toBeNull();
    }
    // Explore and Settings never lock.
    expect(nav(0).getByRole('link', { name: 'Explore' })).toHaveAttribute('href', '/explore');
    expect(nav(0).getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
  });

  it('menteeSetup: Home wears "Set up", goes to onboarding, and says so', () => {
    shell(SETUP);
    const rail = nav(0).getByRole('link', { name: 'Home, finish setting up' });
    expect(rail).toHaveAttribute('href', '/onboarding');
    // Rail: the pill under the label.
    expect(rail).toHaveTextContent('HomeSet up');
    const tab = nav(1).getByRole('link', { name: 'Home, finish setting up' });
    expect(tab).toHaveAttribute('href', '/onboarding');
    // Phone tab: the pill takes the label's place.
    expect(tab).toHaveTextContent(/^homeSet up$/);
    expect(tab.querySelector('[class*="setupPill"]')).toHaveAttribute('aria-hidden', 'true');
  });

  it('no lock: Bookings links as usual with its count; Home keeps its name and page', () => {
    shell(accessFor(member({ onboardingComplete: true })));
    expect(
      nav(0).getByRole('link', { name: 'Bookings, 2 requests awaiting the mentor' }),
    ).toHaveAttribute('href', '/bookings');
    expect(nav(0).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/home');
    expect(document.querySelector('[class*="lockBadge"]')).toBeNull();
    expect(document.querySelector('[class*="setupPill"]')).toBeNull();
  });

  it('the explainer: title, body, two buttons; Escape closes and focus returns to the item', async () => {
    shell(SETUP);
    const user = userEvent.setup();
    const item = nav(0).getByRole('button', { name: /^Bookings, locked/ });
    await user.click(item);
    const dialog = screen.getByRole('dialog', { name: 'Finish setting up to use Bookings' });
    expect(dialog).toHaveTextContent(
      'Tell us what you need help with and your study plans. It’s 2 short steps, and your first session is free.',
    );
    expect(within(dialog).getByRole('link', { name: 'Continue setup' })).toHaveAttribute(
      'href',
      '/onboarding',
    );
    expect(within(dialog).getByRole('button', { name: 'Not now' })).toBeInTheDocument();
    // The lock icon in the header.
    expect(dialog.querySelector('[class*="withIcon"] > span')).toHaveTextContent('lock');
    // Modal md (480px), so the longest title fits one line on desktop (design size="md").
    expect(dialog).toHaveClass('md');
    expect(dialog).not.toHaveClass('sm');
    // Focus moved in.
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(item).toHaveFocus();
  });

  it('"Not now" closes it; focus goes back to the tab it came from', async () => {
    shell(SETUP);
    const user = userEvent.setup();
    const tab = nav(1).getByRole('button', { name: /^Bookings, locked/ });
    await user.click(tab);
    await user.click(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(tab).toHaveFocus();
  });

  it('Tab stays inside the explainer', async () => {
    shell(SETUP);
    const user = userEvent.setup();
    await user.click(nav(0).getByRole('button', { name: /^Bookings, locked/ }));
    const dialog = screen.getByRole('dialog');
    for (let i = 0; i < 5; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it('mentorReview: Bookings locked with its own words; Home opens the application', async () => {
    shell(REVIEW, 'mentor', 'Home');
    const user = userEvent.setup();
    expect(nav(0).getByRole('link', { name: 'Home' })).toHaveAttribute(
      'href',
      '/mentor-application',
    );
    expect(document.querySelector('[class*="setupPill"]')).toBeNull();
    // Calendar, Sessions and Integration stay open in review.
    expect(nav(0).getByRole('link', { name: 'Calendar' })).toHaveAttribute('href', '/calendar');
    expect(nav(0).getByRole('link', { name: 'Sessions' })).toHaveAttribute(
      'href',
      '/session-types',
    );
    await user.click(nav(0).getByRole('button', { name: 'Bookings, opens once you’re approved' }));
    const dialog = screen.getByRole('dialog', { name: 'Bookings opens once you’re approved' });
    expect(dialog).toHaveTextContent(
      'We’re reviewing your application. You can set up your sessions and hours while you wait.',
    );
    expect(within(dialog).getByRole('link', { name: 'See application status' })).toHaveAttribute(
      'href',
      '/mentor-application',
    );
  });

  it('mentorNotApproved: Sessions, Bookings, Calendar, Integration locked; Settings is not', () => {
    shell(DECLINED, 'mentor', 'Home');
    for (const l of ['Sessions', 'Bookings', 'Calendar', 'Integration'])
      expect(nav(0).getByRole('button', { name: `${l}, not available` })).toBeInTheDocument();
    expect(nav(0).getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
    expect(nav(1).getByRole('button', { name: 'Calendar, not available' })).toBeInTheDocument();
  });

  it('the More sheet: a locked item names its reason, trails a lock, and opens the explainer', async () => {
    shell(DECLINED, 'mentor', 'Home');
    const user = userEvent.setup();
    const more = nav(1).getByRole('button', { name: 'More' });
    await user.click(more);
    const sheet = document.getElementById('more-sheet')!;
    const item = within(sheet).getByRole('button', { name: 'Integration, not available' });
    expect(item.querySelector('[class*="sheetLock"]')).toHaveTextContent('lock');
    await user.click(item);
    // The sheet makes way for the explainer.
    expect(document.getElementById('more-sheet')).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Integration isn’t available' })).toHaveTextContent(
      'Your mentor application wasn’t approved.',
    );
    expect(screen.getByRole('link', { name: 'See your result' })).toHaveAttribute(
      'href',
      '/mentor-application',
    );
    await user.keyboard('{Escape}');
    // Its item went with the sheet: focus comes back to More.
    expect(more).toHaveFocus();
  });

  it('loading (/me on its way): no items, so no locks and no counts', () => {
    shell(accessFor({ kind: 'loading', signedIn: true }), 'unknown');
    expect(document.querySelector('[class*="lockBadge"]')).toBeNull();
    expect(document.querySelector('[class*="setupPill"]')).toBeNull();
    expect(screen.queryByText('2')).toBeNull();
  });

  it('copy has no em dashes', () => {
    for (const a of [SETUP, REVIEW, DECLINED]) {
      const c = a.copy!;
      expect([c.why, c.title('Bookings'), c.body, c.cta].join(' ')).not.toMatch(/—/);
    }
  });
});

describe('AppShell: a locked page opened by URL keeps its nav item current', () => {
  it.each([
    ['Bookings', 'menteeSetup', SETUP, 'mentee', 'locked until you finish setting up'],
    ['Bookings', 'mentorReview', REVIEW, 'mentor', 'opens once you’re approved'],
    ['Bookings', 'mentorNotApproved', DECLINED, 'mentor', 'not available'],
    ['Sessions', 'mentorNotApproved', DECLINED, 'mentor', 'not available'],
    ['Calendar', 'mentorNotApproved', DECLINED, 'mentor', 'not available'],
    ['Integration', 'mentorNotApproved', DECLINED, 'mentor', 'not available'],
  ] as const)(
    '%s (%s): the locked rail item is aria-current',
    (item, _state, access, kind, why) => {
      shell(access, kind, item);
      const b = nav(0).getByRole('button', { name: `${item}, ${why}` });
      expect(b).toHaveAttribute('aria-current', 'page');
    },
  );
});
