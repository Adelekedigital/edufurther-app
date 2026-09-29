import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountMenu } from './AccountMenu';

const setup = () => {
  const onLogout = vi.fn();
  render(
    <AccountMenu
      initial="E"
      items={[
        { key: 'profile', label: 'View profile', icon: 'account_box', href: '/mentors/u1' },
        {
          key: 'matches',
          label: 'Find my mentor matches',
          icon: 'route',
          href: 'https://x.test',
          external: true,
        },
        { key: 'logout', label: 'Logout', icon: 'logout', danger: true, onSelect: onLogout },
      ]}
    />,
  );
  return { onLogout, button: screen.getByRole('button', { name: 'Account menu' }) };
};

describe('AccountMenu', () => {
  it('opens with focus on the first item; arrows wrap; Escape returns focus', async () => {
    const { button } = setup();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const items = screen.getAllByRole('menuitem');
    expect(items[0]).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    expect(items[2]).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(items[0]).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(items[1]).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('Logout runs and closes; the external link opens in a new tab', async () => {
    const { button, onLogout } = setup();
    await userEvent.click(button);
    expect(screen.getByRole('menuitem', { name: /Find my mentor matches/ })).toHaveAttribute(
      'target',
      '_blank',
    );
    await userEvent.click(screen.getByRole('menuitem', { name: /Logout/ }));
    expect(onLogout).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('an in-app link opens in the same tab, first in the menu, and closes it (review of #61)', async () => {
    const { button } = setup();
    await userEvent.click(button);
    const profile = screen.getByRole('menuitem', { name: /View profile/ });
    expect(profile).toHaveFocus();
    expect(profile).toHaveAttribute('href', '/mentors/u1');
    expect(profile).not.toHaveAttribute('target');
    await userEvent.click(profile);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
