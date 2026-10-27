import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from './AppShell';

// Two "Main" navs: the rail (≥768px) first, the bottom tabs (<768px) second.
const nav = (i: 0 | 1) => within(screen.getAllByRole('navigation', { name: 'Main' })[i]!);
const hrefs = (i: 0 | 1) =>
  nav(i)
    .getAllByRole('link')
    .map((a) => a.getAttribute('href'));

describe('AppShell: the admin app (Admin PRD, Access)', () => {
  it('admin nav is Mentors and Credits, on the rail and the phone tabs, with no More', () => {
    render(
      <AppShell active="Mentors" nav="admin" chrome="member" offline={false}>
        <p>Page</p>
      </AppShell>,
    );
    expect(hrefs(0)).toEqual(['/', '/admin/mentors', '/admin/credits']);
    expect(hrefs(1)).toEqual(['/admin/mentors', '/admin/credits']);
    expect(nav(1).queryByRole('button', { name: 'More' })).toBeNull();
    expect(screen.queryByRole('link', { name: /Team calls/ })).toBeNull();
    expect(nav(0).getByRole('link', { name: 'Mentors' })).toHaveAttribute('aria-current', 'page');
  });

  it('the Mentors badge counts applications waiting, "9+" above nine', () => {
    render(
      <AppShell
        active="Credits"
        nav="admin"
        chrome="member"
        offline={false}
        account={{
          avatar: { initials: 'AO', cover: 'sky' },
          items: [],
          counts: { Mentors: { count: 12, label: '12 applications waiting' } },
        }}
      >
        <p>Page</p>
      </AppShell>,
    );
    const link = nav(0).getByRole('link', { name: 'Mentors, 12 applications waiting' });
    expect(within(link).getByText('9+')).toBeInTheDocument();
  });

  it('an admin in the member app gets the Admin item at the rail foot, under a divider', () => {
    render(
      <AppShell active="Home" nav="mentee" adminEntry chrome="member" offline={false}>
        <p>Page</p>
      </AppShell>,
    );
    const admin = nav(0).getByRole('link', { name: 'Admin' });
    expect(admin).toHaveAttribute('href', '/admin/mentors');
    // Last in the rail, after its own divider.
    expect(hrefs(0).at(-1)).toBe('/admin/mentors');
    const list = admin.closest('ul')!;
    expect(list.previousElementSibling).toHaveAttribute('aria-hidden');
    // Not a phone tab.
    expect(nav(1).queryByRole('link', { name: 'Admin' })).toBeNull();
  });

  it('phones: the Admin item is in the More sheet, for mentors and mentees', async () => {
    for (const role of ['mentor', 'mentee'] as const) {
      const { unmount } = render(
        <AppShell active="Home" nav={role} adminEntry chrome="member" offline={false}>
          <p>Page</p>
        </AppShell>,
      );
      await userEvent.click(nav(1).getByRole('button', { name: 'More' }));
      const sheet = document.getElementById('more-sheet')!;
      expect(within(sheet).getByRole('link', { name: 'Admin' })).toHaveAttribute(
        'href',
        '/admin/mentors',
      );
      unmount();
    }
  });

  it('nobody else sees an Admin item', () => {
    render(
      <AppShell active="Home" nav="mentor" chrome="member" offline={false}>
        <p>Page</p>
      </AppShell>,
    );
    expect(screen.queryByRole('link', { name: 'Admin' })).toBeNull();
  });
});
