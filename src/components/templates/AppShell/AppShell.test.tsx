import { render, screen, within } from '@testing-library/react';
import { AppShell } from './AppShell';

// Two "Main" navs: the rail (≥768px) first, the bottom tabs (<768px) second.
const nav = (i: 0 | 1) => within(screen.getAllByRole('navigation', { name: 'Main' })[i]!);
const hrefs = (i: 0 | 1) =>
  nav(i)
    .getAllByRole('link')
    .map((a) => a.getAttribute('href'));

describe('AppShell navigation', () => {
  it('mentees get Home, Explore, Bookings, Messages, Settings (the default)', () => {
    render(
      <AppShell active="Explore" chrome="member" offline={false}>
        <p>Page</p>
      </AppShell>,
    );
    expect(hrefs(0)).toEqual(['/', '/explore', '/bookings', '/messages', '/settings']);
    expect(hrefs(1)).toEqual(['/', '/explore', '/bookings']);
  });

  it('mentors get the mentor nav, with Sessions linking to session types', () => {
    render(
      <AppShell active="Sessions" nav="mentor" chrome="member" offline={false}>
        <p>Page</p>
      </AppShell>,
    );
    expect(hrefs(0)).toEqual([
      '/',
      '/session-types',
      '/bookings',
      '/messages',
      '/calendar',
      '/integrations',
      '/settings',
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
});
