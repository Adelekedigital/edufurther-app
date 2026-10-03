import { render, screen, within } from '@testing-library/react';
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
const three = { left: 3, total: 4, resetsOn: 'Nov 1' };
// Two pills render (the desktop bar's and the phone header's); CSS shows one.
const firstPill = () => screen.getAllByRole('button', { name: /credits left/ })[0]!;

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
    expect(dialog).toHaveTextContent('3 of 4 credits left');
    expect(dialog).toHaveTextContent(
      'Each free session uses 1 credit. Your credits reset on Nov 1.',
    );
    expect(within(dialog).getByRole('link', { name: 'See my bookings' })).toHaveAttribute(
      'href',
      '/bookings',
    );
    // No refund promise: cancellations don't refund yet (backend #335).
    expect(dialog).not.toHaveTextContent(/credit comes back/);
    expect(pill).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Your credits' })).toBeNull();
    expect(pill).toHaveFocus();
  });

  it('the account menu shows the credits block above the menu, and "How credits work" opens the explainer', async () => {
    shell(three);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Account menu' }));
    expect(screen.getByText('Resets Nov 1')).toBeInTheDocument();
    // The block isn't a menu item: the menu holds items only.
    const menu = screen.getByRole('menu', { name: 'Account' });
    expect(within(menu).queryByText('How credits work')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'How credits work' }));
    expect(screen.getByRole('dialog', { name: 'Your credits' })).toBeInTheDocument();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('out of credits: the explainer says so', async () => {
    shell({ left: 0, total: 4, resetsOn: 'Nov 1' });
    await userEvent.click(screen.getAllByRole('button', { name: /No credits left/ })[0]!);
    expect(screen.getByRole('dialog', { name: 'Your credits' })).toHaveTextContent(
      'You’ve used this month’s credits. They reset on Nov 1.',
    );
  });
});
