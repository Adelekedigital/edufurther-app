import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Viewer } from '@/types/mentor';
import { AppShell } from './AppShell';

// The mentor pages switched on, before access.ts reads them.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_MENTOR_ONBOARDING_ENABLED = 'true';
});
const { accessFor } = await import('@/lib/utils/access');

// AppShell.dc.html values the build had drifted from (PR D, shell gaps).

const nav = (i: 0 | 1) => within(screen.getAllByRole('navigation', { name: 'Main' })[i]!);
// A mentor in review: Bookings is locked, with the reason in its name.
const REVIEW = accessFor({
  kind: 'member',
  id: 'u1',
  firstName: 'Ada',
  initial: 'A',
  isMentee: false,
  isApprovedMentor: false,
  isMentor: true,
  mentorStage: 'pending',
  completedSessions: 0,
  credits: null,
} as Extract<Viewer, { kind: 'member' }>);
const AV = { initial: 'G', cover: 'sky' as const };
const ITEMS = [{ key: 'logout', label: 'Logout', icon: 'logout' as const, onSelect: () => {} }];

const css = (file: string) =>
  readFileSync(join(__dirname, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
/** The declarations of the block whose selector list ends with `selector`. */
const block = (src: string, selector: string) => {
  const at = src.indexOf(`${selector} {`);
  expect(at).toBeGreaterThan(-1);
  return src.slice(at, src.indexOf('}', at));
};

describe('AppShell, as designed', () => {
  it('the current phone tab and the current More item read blue-500 (design t.color, mi.color)', () => {
    const shell = css('AppShell.module.css');
    expect(block(shell, '.tab[data-current]')).toMatch(/color:\s*var\(--blue-500\)/);
    const item = block(shell, ".sheetItem[aria-current='page']");
    expect(item).toMatch(/background:\s*var\(--blue-50\)/);
    expect(item).toMatch(/color:\s*var\(--blue-500\)/);
  });

  it('More is lit while its sheet is open, not only on one of its pages (design moreOn || more)', async () => {
    render(
      <AppShell active="Home" nav="mentor" chrome="member" offline={false}>
        <p>Page</p>
      </AppShell>,
    );
    const more = nav(1).getByRole('button', { name: 'More' });
    expect(more).not.toHaveAttribute('data-current');
    await userEvent.click(more);
    expect(more).toHaveAttribute('data-current', 'true');
    await userEvent.click(more);
    expect(more).not.toHaveAttribute('data-current');
  });

  it('every rail item has its label as a tooltip; a locked one keeps its reasoned name', () => {
    render(
      <AppShell active="Home" nav="mentor" chrome="member" offline={false} access={REVIEW}>
        <p>Page</p>
      </AppShell>,
    );
    const rail = nav(0);
    const items = rail.getAllByRole('listitem').map((li) => li.firstElementChild!);
    expect(items.map((el) => el.getAttribute('title'))).toEqual([
      'Home',
      'Bookings',
      'Calendar',
      'Sessions',
      'Integration',
      'Settings',
    ]);
    const locked = rail.getByRole('button', { name: /^Bookings, / });
    expect(locked).toHaveAccessibleName(`Bookings, ${REVIEW.copy!.why}`);
    expect(locked).toHaveAttribute('title', 'Bookings');
  });

  it('the account menu is 136px for mentors and 212px for mentees (design menuW)', async () => {
    const menu = css('../../molecules/AccountMenu/AccountMenu.module.css');
    expect(block(menu, '.menu')).toMatch(/width:\s*212px/);
    expect(block(menu, '.narrow')).toMatch(/width:\s*136px/);
    for (const [role, narrow] of [
      ['mentor', true],
      ['mentee', false],
    ] as const) {
      const { unmount } = render(
        <AppShell
          active="Home"
          nav={role}
          chrome="member"
          offline={false}
          account={{ avatar: AV, items: ITEMS }}
        >
          <p>Page</p>
        </AppShell>,
      );
      await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));
      const box = screen.getByRole('menu', { name: 'Account' }).parentElement!;
      expect(box.classList.contains('narrow')).toBe(narrow);
      unmount();
    }
  });
});
