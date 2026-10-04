import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CreditsView } from '@/lib/utils/credits';
import { AppShell } from './AppShell';

const AV = { initial: 'A', cover: 'sky' as const };
const shell = (credits?: CreditsView) =>
  render(
    <AppShell
      active="Explore"
      nav="mentee"
      chrome="member"
      offline={false}
      account={{ avatar: AV, items: [], credits }}
    >
      <p>Page</p>
    </AppShell>,
  );
// 3 of 3 monthly plus the starter credit: 4 to spend.
const three: CreditsView = {
  left: 4,
  monthlyLeft: 3,
  monthlyTotal: 3,
  bonus: [{ count: 1, expires: false, expiresOn: null }],
  showMonthly: true,
  resetsOn: 'Nov 1',
};
// Two pills render (the desktop bar's and the phone header's); CSS shows one.
const firstPill = () => screen.getAllByRole('button', { name: /credits? left/ })[0]!;

describe('AppShell: a mentee’s credits', () => {
  it('no credits (mentors, or none sent): no pill', () => {
    shell(undefined);
    expect(screen.queryByRole('button', { name: /credits left/ })).toBeNull();
  });

  it('the pill opens "Your credits"; Escape closes it and focus goes back to the pill', async () => {
    shell(three);
    const user = userEvent.setup();
    const pill = firstPill();
    await user.click(pill);
    const dialog = screen.getByRole('dialog', { name: 'Your credits' });
    // Design creditSplit: the total, then Monthly / Bonus rows.
    expect(dialog).toHaveTextContent('4 credits left');
    expect(dialog).toHaveTextContent('MonthlyResets Nov 13 of 3');
    expect(dialog).toHaveTextContent('BonusNever expires1');
    expect(dialog).toHaveTextContent('Expiring credits are used first.');
    // No promise of 3 every month: the grant needs an invite first.
    expect(dialog).not.toHaveTextContent(/3 credits (on|every)/);
    expect(within(dialog).getByRole('link', { name: 'See my bookings' })).toHaveAttribute(
      'href',
      '/bookings',
    );
    // The backend's refund rule (decision 229): 12 hours, not the design's 1;
    // a no-show refunds only when the mentee joined.
    // Closed by default, so the card leads with the balance.
    const toggle = within(dialog).getByRole('button', { name: 'Refund policy' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    // No reference to a panel that isn't there yet.
    expect(toggle).not.toHaveAttribute('aria-controls');
    expect(dialog).not.toHaveTextContent('you cancel 12+ hours before');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const body = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    expect(within(body).getAllByRole('listitem')).toHaveLength(5);
    expect(body).toHaveTextContent('your mentor misses a session you joined');
    expect(body).toHaveTextContent('you cancel 12+ hours before');
    expect(dialog).not.toHaveTextContent(/1 hour/);
    expect(pill).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Your credits' })).toBeNull();
    expect(pill).toHaveFocus();
  });

  it('account menu: the credits group comes first; the keyboard reaches "How credits work", and focus returns to the avatar', async () => {
    shell(three);
    const user = userEvent.setup();
    const avatar = screen.getByRole('button', { name: 'Account menu' });
    await user.click(avatar);
    const menu = screen.getByRole('menu', { name: 'Account' });
    const group = within(menu).getByRole('group', { name: 'Credits' });
    expect(group).toHaveTextContent('4 credits left');
    expect(group).toHaveTextContent('Resets Nov 1');
    const how = within(group).getByRole('menuitem', { name: 'How credits work' });
    // Opening the menu focuses its first item: the credits one.
    expect(how).toHaveFocus();
    expect(how).toHaveAccessibleDescription('4 credits left Resets Nov 1');
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog', { name: 'Your credits' })).toBeInTheDocument();
    expect(screen.queryByRole('menu')).toBeNull();
    await user.keyboard('{Escape}');
    expect(avatar).toHaveFocus();
  });

  it('More sheet (phones): "How credits work" opens the explainer; closing returns focus to More', async () => {
    shell(three);
    const user = userEvent.setup();
    const more = screen.getByRole('button', { name: 'More' });
    await user.click(more);
    const sheet = document.getElementById('more-sheet')!;
    await user.click(within(sheet).getByRole('button', { name: 'How credits work' }));
    expect(document.getElementById('more-sheet')).toBeNull();
    await user.keyboard('{Escape}');
    expect(more).toHaveFocus();
  });

  it('Tab stays inside "Your credits"', async () => {
    shell(three);
    const user = userEvent.setup();
    await user.click(firstPill());
    const dialog = screen.getByRole('dialog', { name: 'Your credits' });
    for (let i = 0; i < 5; i++) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('out of credits: the explainer says so, with the monthly row at 0', async () => {
    shell({ ...three, left: 0, monthlyLeft: 0, bonus: [] });
    await userEvent.click(screen.getAllByRole('button', { name: /No credits left/ })[0]!);
    const dialog = screen.getByRole('dialog', { name: 'Your credits' });
    expect(dialog).toHaveTextContent('No credits left');
    expect(dialog).toHaveTextContent('MonthlyResets Nov 10 of 3');
  });

  it('closing after the layout switched (desktop ↔ phone) focuses the pill that is showing now', async () => {
    shell(three);
    const user = userEvent.setup();
    const [bar, header] = screen.getAllByRole('button', { name: /credits left/ });
    await user.click(bar!);
    // The window crossed 768px: the bar's pill is hidden, the header's shows.
    bar!.getClientRects = () => [] as unknown as DOMRectList;
    header!.getClientRects = () => [{}] as unknown as DOMRectList;
    await user.keyboard('{Escape}');
    expect(header).toHaveFocus();
  });

  it('the pill reads the total and its parts; no Bonus row when there is none', async () => {
    shell({ ...three, left: 3, bonus: [] });
    expect(firstPill()).toHaveAccessibleName('3 credits left, monthly resets Nov 1');
    await userEvent.click(firstPill());
    expect(screen.getByRole('dialog', { name: 'Your credits' })).not.toHaveTextContent(/Bonus/);
  });

  it('monthly grant not unlocked (starter only): no Monthly row or reset', async () => {
    const starter: CreditsView = {
      ...three,
      left: 1,
      monthlyLeft: 0,
      showMonthly: false,
      resetsOn: null,
    };
    shell(starter);
    const user = userEvent.setup();
    await user.click(firstPill());
    const dialog = screen.getByRole('dialog', { name: 'Your credits' });
    expect(dialog).toHaveTextContent('1 credit left');
    expect(dialog).not.toHaveTextContent(/monthly/i);
    expect(dialog).toHaveTextContent('BonusNever expires1');
    await user.keyboard('{Escape}');
    cleanup();
    shell({ ...starter, left: 0, bonus: [] });
    await user.click(screen.getAllByRole('button', { name: /No credits left/ })[0]!);
    const out = screen.getByRole('dialog', { name: 'Your credits' });
    expect(out).toHaveTextContent('No credits left');
    expect(out).not.toHaveTextContent(/monthly/i);
  });
});
