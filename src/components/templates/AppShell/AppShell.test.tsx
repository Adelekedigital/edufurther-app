import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from './AppShell';

// Two "Main" navs: the rail (≥768px) first, the bottom tabs (<768px) second.
const nav = (i: 0 | 1) => within(screen.getAllByRole('navigation', { name: 'Main' })[i]!);
const hrefs = (i: 0 | 1) =>
  nav(i)
    .getAllByRole('link')
    .map((a) => a.getAttribute('href'));

// Rail items per group (daily, then set up), by href.
const groups = (i: 0 | 1) =>
  nav(i)
    .getAllByRole('list')
    .map((ul) =>
      within(ul)
        .getAllByRole('link')
        .map((a) => a.getAttribute('href')),
    );

describe('AppShell navigation', () => {
  it('mentees get Home, Explore, Bookings | Settings (the default)', () => {
    render(
      <AppShell active="Explore" chrome="member" offline={false}>
        <p>Page</p>
      </AppShell>,
    );
    expect(hrefs(0)).toEqual(['/', '/', '/explore', '/bookings', '/settings']);
    expect(groups(0)).toEqual([['/', '/explore', '/bookings'], ['/settings']]);
    // A divider sits between the two groups, and only there.
    const [daily, setup] = nav(0).getAllByRole('list');
    expect(daily!.nextElementSibling).toHaveAttribute('aria-hidden');
    expect(daily!.nextElementSibling!.nextElementSibling).toBe(setup);
    expect(hrefs(1)).toEqual(['/', '/explore', '/bookings']);
  });

  it('Messages is not shown anywhere until it is built (product, 2026-09-30)', async () => {
    for (const role of ['mentee', 'mentor'] as const) {
      const { unmount } = render(
        <AppShell active="Home" nav={role} chrome="member" offline={false}>
          <p>Page</p>
        </AppShell>,
      );
      await userEvent.click(nav(1).getByRole('button', { name: 'More' }));
      expect(screen.queryByRole('link', { name: 'Messages' })).toBeNull();
      unmount();
    }
  });

  it('members get the brand mark at the top of the rail; guests keep the header logo', () => {
    const { unmount } = render(
      <AppShell active="Home" nav="mentor" chrome="member" offline={false}>
        <p>Page</p>
      </AppShell>,
    );
    const home = nav(0).getByRole('link', { name: 'EduFurther home' });
    expect(home).toHaveAttribute('href', '/');
    // The swoosh mark, not the wordmark, at the design's 48px.
    const mark = home.querySelector('img')!;
    expect(decodeURIComponent(mark.getAttribute('src')!)).toContain(
      '/brand/edufurther-mark-swoosh.png',
    );
    expect(mark).toHaveAttribute('width', '48');
    unmount();
    render(
      <AppShell active="Explore" chrome="guest" offline={false}>
        <p>Page</p>
      </AppShell>,
    );
    expect(screen.queryByRole('navigation', { name: 'Main' })).toBeNull();
    expect(
      within(screen.getByRole('banner')).getByRole('link', { name: 'EduFurther home' }),
    ).toBeInTheDocument();
  });

  it('mentors get the mentor nav, with Sessions linking to session types', () => {
    render(
      <AppShell active="Sessions" nav="mentor" chrome="member" offline={false}>
        <p>Page</p>
      </AppShell>,
    );
    expect(groups(0)).toEqual([
      ['/', '/bookings', '/calendar'],
      ['/session-types', '/integrations', '/settings'],
    ]);
    expect(nav(0).getByRole('link', { name: 'Sessions' })).toHaveAttribute('aria-current', 'page');
  });

  it('mentor tabs on phones: Home, Calendar, Bookings, then More (current for Sessions)', () => {
    render(
      <AppShell active="Sessions" nav="mentor" chrome="member" offline={false}>
        <p>Page</p>
      </AppShell>,
    );
    expect(hrefs(1)).toEqual(['/', '/calendar', '/bookings']);
    expect(nav(1).getByRole('button', { name: 'More' })).toHaveAttribute('data-current', 'true');
  });

  it('mentors never see Explore or Admin; mentees never see Admin (product, 2026-09-28)', () => {
    const { unmount } = render(
      <AppShell active="Home" nav="mentor" chrome="member" offline={false}>
        <p>Page</p>
      </AppShell>,
    );
    expect(screen.queryByRole('link', { name: 'Explore' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Admin' })).toBeNull();
    unmount();
    render(
      <AppShell active="Home" nav="mentee" chrome="member" offline={false}>
        <p>Page</p>
      </AppShell>,
    );
    expect(screen.queryByRole('link', { name: 'Admin' })).toBeNull();
  });

  it('role not known yet: no nav items and no More, so the wrong set never flashes', () => {
    render(
      <AppShell active="Explore" nav="unknown" chrome="member" offline={false}>
        <p>Page</p>
      </AppShell>,
    );
    expect(nav(0).queryAllByRole('list')).toHaveLength(0);
    expect(nav(1).queryAllByRole('link')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'More' })).toBeNull();
  });

  it('the More sheet opens in-app account links in the same tab, external ones in a new tab', async () => {
    render(
      <AppShell
        active="Sessions"
        nav="mentor"
        chrome="member"
        offline={false}
        account={{
          initial: 'G',
          items: [
            { key: 'profile', label: 'View profile', icon: 'account_box', href: '/mentors/u1' },
            {
              key: 'matches',
              label: 'Find my mentor matches',
              icon: 'route',
              href: 'https://x.test',
              external: true,
            },
          ],
        }}
      >
        <p>Page</p>
      </AppShell>,
    );
    await userEvent.click(nav(1).getByRole('button', { name: 'More' }));
    const profile = screen.getAllByRole('link', { name: /View profile/ }).at(-1)!;
    expect(profile).toHaveAttribute('href', '/mentors/u1');
    expect(profile).not.toHaveAttribute('target');
    const matches = screen.getAllByRole('link', { name: /Find my mentor matches/ }).at(-1)!;
    expect(matches).toHaveAttribute('target', '_blank');
  });
});
