import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from './AppShell';

const account = { avatar: { initials: 'AO', cover: 'sky' as const }, items: [] };

describe('AppShell: Preview as user’s way in (AppShell.dc.html vaEntry)', () => {
  it('onPreview: a "Preview as user" icon button in the header and in the content bar', async () => {
    const onPreview = vi.fn();
    render(
      <AppShell
        active="Mentors"
        nav="admin"
        chrome="member"
        account={account}
        onPreview={onPreview}
        offline={false}
      >
        <p>Page</p>
      </AppShell>,
    );
    const buttons = screen.getAllByRole('button', { name: 'Preview as user' });
    expect(buttons).toHaveLength(2);
    await userEvent.click(buttons[0]!);
    await userEvent.click(buttons[1]!);
    expect(onPreview).toHaveBeenCalledTimes(2);
  });

  it('no onPreview (not allowed, or already previewing): no button', () => {
    render(
      <AppShell active="Mentors" nav="admin" chrome="member" account={account} offline={false}>
        <p>Page</p>
      </AppShell>,
    );
    expect(screen.queryByRole('button', { name: 'Preview as user' })).toBeNull();
  });

  it('a guest never gets it', () => {
    render(
      <AppShell active="Explore" chrome="guest" onPreview={vi.fn()} offline={false}>
        <p>Page</p>
      </AppShell>,
    );
    expect(screen.queryByRole('button', { name: 'Preview as user' })).toBeNull();
  });
});
