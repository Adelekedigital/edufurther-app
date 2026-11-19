import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from './AppShell';

// Two "Main" navs: the rail (≥768px) first, the bottom tabs (<768px) second.
const phoneNav = () => within(screen.getAllByRole('navigation', { name: 'Main' })[1]!);

function shell(onInstall?: () => void) {
  render(
    <AppShell
      active="Home"
      nav="mentee"
      chrome="member"
      offline={false}
      onInstall={onInstall}
      account={{
        avatar: { initials: 'AO', cover: 'sky' },
        items: [
          { key: 'settings', label: 'Settings', icon: 'settings', href: '/settings' },
          { key: 'logout', label: 'Logout', icon: 'logout', danger: true, onSelect: vi.fn() },
        ],
      }}
    >
      <p>Page</p>
    </AppShell>,
  );
}

describe('AppShell: "Install the app" in More (install nudge, owner 2026-11-18)', () => {
  it('last, below Logout, with its subline; opens the nudge and hands focus to More', async () => {
    const onInstall = vi.fn();
    shell(onInstall);
    const more = phoneNav().getByRole('button', { name: 'More' });
    await userEvent.click(more);
    const sheet = document.getElementById('more-sheet')!;
    const items = within(sheet)
      .getAllByRole('listitem')
      .map((li) => li.textContent);
    expect(items.at(-2)).toContain('Logout');
    expect(items.at(-1)).toBe(
      'downloadInstall the appSession reminders, one tap from your home screen',
    );
    await userEvent.click(within(sheet).getByRole('button', { name: /Install the app/ }));
    expect(onInstall).toHaveBeenCalledTimes(1);
    expect(document.getElementById('more-sheet')).toBeNull();
    expect(document.activeElement).toBe(more);
  });

  it('not there where the sheet can’t help (installed app, desktop, no way to install)', async () => {
    shell(undefined);
    await userEvent.click(phoneNav().getByRole('button', { name: 'More' }));
    expect(screen.queryByRole('button', { name: /Install the app/ })).toBeNull();
  });

  it('never in the desktop account menu', () => {
    shell(vi.fn());
    expect(screen.queryByText('Install the app')).toBeNull();
  });
});
