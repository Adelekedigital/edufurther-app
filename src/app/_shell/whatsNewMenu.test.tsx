import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from '@/components/templates/AppShell/AppShell';
import type { Access } from '@/lib/utils/access';
import type { Viewer } from '@/types/mentor';

// The "What's new" item in the account menu (desktop) and More sheet (phones),
// offered until the release's replay window ends (23 Dec) (owner, 2026-11-20).
const flag = vi.hoisted(() => ({ on: true }));
vi.mock('@/lib/config/whatsNew', () => ({
  get WHATS_NEW_LIVE() {
    return flag.on;
  },
}));
vi.mock('@/lib/api/data/auth', () => ({ useSignOut: () => vi.fn() }));
vi.mock('@/lib/api/data/viewer', () => ({ useViewer: () => ({ kind: 'guest' }) }));
const { accountItems } = await import('./useAppShell');
const { replayLinks, tourReplay } = await import('./useWhatsNew');

type Member = Extract<Viewer, { kind: 'member' }>;
const mentee = {
  kind: 'member',
  id: 'u1',
  firstName: 'Ada',
  initials: 'AO',
  isMentee: true,
  isApprovedMentor: false,
  isMentor: false,
  completedSessions: 0,
  credits: null,
  isMigrated: true,
  seenItems: ['whats-new:2026-11-migration'],
} as Member;
const IN_WINDOW = Date.parse('2026-11-25T09:00:00Z');
const AFTER = Date.parse('2026-12-23T00:00:00Z');
const setup = {
  state: 'menteeSetup',
  locked: new Set(),
  copy: null,
  homeHref: null,
  setupPill: true,
} as unknown as Access;

function shell(now: number, opts: { previewing?: boolean; access?: Access; m?: Member } = {}) {
  const m = opts.m ?? mentee;
  // As WhatsNewHost hands it to the shell.
  const items = accountItems(
    m,
    vi.fn(),
    opts.access,
    false,
    replayLinks(tourReplay(m, opts.previewing ?? false, now))?.menuItem,
  );
  return render(
    <AppShell
      active="Home"
      nav="mentee"
      chrome="member"
      offline={false}
      account={{ avatar: { initials: 'AO', cover: 'sky' }, items }}
    >
      <p>Page</p>
    </AppShell>,
  );
}

const tabs = () => within(screen.getAllByRole('navigation', { name: 'Main' })[1]!);

describe('the What’s new menu item', () => {
  it('in its window, even once seen: in the More sheet and the account menu, to Home’s replay', async () => {
    shell(IN_WINDOW);
    await userEvent.click(tabs().getByRole('button', { name: 'More' }));
    expect(
      within(document.getElementById('more-sheet')!).getByRole('link', { name: 'What’s new' }),
    ).toHaveAttribute('href', '/home?tour=replay');
    await userEvent.click(screen.getByRole('button', { name: /account menu/i }));
    expect(screen.getByRole('menuitem', { name: 'What’s new' })).toHaveAttribute(
      'href',
      '/home?tour=replay',
    );
  });

  it('NEXT_PUBLIC_WHATS_NEW_ENABLED off: no item, no Settings link, no tour on Home', async () => {
    flag.on = false;
    try {
      shell(IN_WINDOW);
      await userEvent.click(tabs().getByRole('button', { name: 'More' }));
      expect(screen.queryByRole('link', { name: 'What’s new' })).toBeNull();
      expect(tourReplay(mentee, false, IN_WINDOW)).toBeUndefined();
    } finally {
      flag.on = true;
    }
  });

  it('gone once the replay window ends (23 Dec)', async () => {
    shell(AFTER);
    await userEvent.click(tabs().getByRole('button', { name: 'More' }));
    expect(screen.queryByRole('link', { name: 'What’s new' })).toBeNull();
  });

  it('never in Preview as user, in the setup lock, or for an account made here', async () => {
    for (const opts of [
      { previewing: true },
      { access: setup },
      { m: { ...mentee, isMigrated: false } },
    ]) {
      const { unmount } = shell(IN_WINDOW, opts);
      await userEvent.click(tabs().getByRole('button', { name: 'More' }));
      expect(screen.queryByRole('link', { name: 'What’s new' })).toBeNull();
      unmount();
    }
  });

  it('replayLinks: the menu item, in each release’s words (its one place)', () => {
    expect(replayLinks(tourReplay(mentee, false, IN_WINDOW))).toEqual({
      menuItem: { label: 'What’s new', href: '/home?tour=replay' },
    });
    const made = { ...mentee, isMigrated: false, seenItems: [] };
    expect(replayLinks(tourReplay(made, false, AFTER))).toEqual({
      menuItem: { label: 'Welcome tour', href: '/home?tour=replay' },
    });
    expect(replayLinks(undefined)).toBeUndefined();
  });

  it('an account made here gets "Welcome tour" instead, with no end date', async () => {
    shell(Date.parse('2027-06-01T00:00:00Z'), { m: { ...mentee, isMigrated: false } });
    await userEvent.click(tabs().getByRole('button', { name: 'More' }));
    expect(
      within(document.getElementById('more-sheet')!).getByRole('link', { name: 'Welcome tour' }),
    ).toHaveAttribute('href', '/home?tour=replay');
  });
});
