import { render, screen } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';

// The shell, viewer and connectivity are mocked: this tests the layout's own
// contract — one AppShell, its props derived from the route and the viewer —
// not AppShell's internals (covered by its own tests).
const h = vi.hoisted(() => ({
  pathname: '/bookings',
  online: true,
  shell: { chrome: 'member', nav: 'mentor', account: { items: [] } } as {
    chrome: string;
    nav: string;
    account: unknown;
  },
}));

vi.mock('next/navigation', () => ({ usePathname: () => h.pathname }));
vi.mock('@/lib/utils/useOnline', () => ({ useOnline: () => h.online }));
vi.mock('@/app/_shell/useAppShell', () => ({ useAppShell: () => h.shell }));
vi.mock('@/components/templates/AppShell/AppShell', () => ({
  // Stand-in with the one landmark the focus effect looks for.
  AppShell: (props: {
    active: string;
    nav: string;
    chrome: string;
    offline: boolean;
    children: ReactNode;
  }) => (
    <main
      id="main"
      data-testid="app-shell"
      data-active={props.active}
      data-nav={props.nav}
      data-chrome={props.chrome}
      data-offline={String(props.offline)}
    >
      {props.children}
    </main>
  ),
}));

import AppGroupLayout, { activeFor } from './layout';

beforeEach(() => {
  h.pathname = '/bookings';
  h.online = true;
  h.shell = { chrome: 'member', nav: 'mentor', account: { items: [] } };
});

describe('activeFor', () => {
  it.each([
    ['/dashboard', 'Home'],
    ['/home', 'Home'],
    ['/bookings', 'Bookings'],
    ['/calendar', 'Calendar'],
    ['/explore', 'Explore'],
    ['/integrations', 'Integration'],
    ['/session-types', 'Sessions'],
    ['/session-types/new', 'Sessions'],
    ['/session-types/abc/edit', 'Sessions'],
    ['/settings', 'Settings'],
  ])('maps %s to %s', (pathname, expected) => {
    expect(activeFor(pathname)).toBe(expected);
  });

  it('is empty for an unmapped route', () => {
    expect(activeFor('/')).toBe('');
    expect(activeFor('/something-else')).toBe('');
  });
});

describe('AppGroupLayout', () => {
  it('renders the shell once, with active derived from the pathname', () => {
    h.pathname = '/calendar';
    render(
      <AppGroupLayout>
        <h1>Your calendar</h1>
      </AppGroupLayout>,
    );
    // getByTestId throws if there were more than one — the shell is rendered once.
    const shell = screen.getByTestId('app-shell');
    expect(shell).toHaveAttribute('data-active', 'Calendar');
    expect(screen.getByRole('heading', { name: 'Your calendar' })).toBeInTheDocument();
  });

  it('passes the viewer-aware chrome and offline state straight through', () => {
    h.shell = { chrome: 'guest', nav: 'unknown', account: undefined };
    h.online = false;
    render(
      <AppGroupLayout>
        <p>content</p>
      </AppGroupLayout>,
    );
    const shell = screen.getByTestId('app-shell');
    expect(shell).toHaveAttribute('data-chrome', 'guest');
    expect(shell).toHaveAttribute('data-nav', 'unknown');
    expect(shell).toHaveAttribute('data-offline', 'true');
  });

  it('moves focus to the page heading on route change, but not on first mount', () => {
    h.pathname = '/bookings';
    const { rerender } = render(
      <AppGroupLayout>
        <h1>Bookings</h1>
      </AppGroupLayout>,
    );
    // A fresh mount keeps the browser's focus — it does not steal it.
    expect(screen.getByRole('heading', { name: 'Bookings' })).not.toHaveFocus();

    h.pathname = '/calendar';
    rerender(
      <AppGroupLayout>
        <h1>Your calendar</h1>
      </AppGroupLayout>,
    );
    expect(screen.getByRole('heading', { name: 'Your calendar' })).toHaveFocus();
  });

  it('does not steal focus on first mount under StrictMode (double-invoked effects)', () => {
    h.pathname = '/bookings';
    render(
      <StrictMode>
        <AppGroupLayout>
          <h1>Bookings</h1>
        </AppGroupLayout>
      </StrictMode>,
    );
    // StrictMode double-invokes the focus effect on mount; the hook keys off the
    // previous pathname (equal across the double-invoke) so it still counts as
    // first mount and leaves the browser's focus alone (ADR 0007).
    expect(screen.getByRole('heading', { name: 'Bookings' })).not.toHaveFocus();
  });

  it('falls back to the main landmark when the new page has no heading yet', () => {
    h.pathname = '/bookings';
    const { rerender } = render(
      <AppGroupLayout>
        <h1>Bookings</h1>
      </AppGroupLayout>,
    );
    h.pathname = '/dashboard';
    rerender(
      <AppGroupLayout>
        <div role="status">Loading your dashboard</div>
      </AppGroupLayout>,
    );
    expect(screen.getByTestId('app-shell')).toHaveFocus();
  });
});
