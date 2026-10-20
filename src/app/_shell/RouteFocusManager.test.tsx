import { render, screen } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';

const h = vi.hoisted(() => ({ pathname: '/bookings' }));
vi.mock('next/navigation', () => ({ usePathname: () => h.pathname }));

import { RouteFocusManager, skipNextRouteFocus } from './RouteFocusManager';

// The manager focuses the current route's #main landmark, the way AppShell
// provides one in the app. It is mounted once at the root and persists across
// every navigation, so rerendering the same tree with a new pathname models a
// client-side route change.
function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <main id="main">{children}</main>
      <RouteFocusManager />
    </>
  );
}

beforeEach(() => {
  h.pathname = '/bookings';
});

describe('RouteFocusManager', () => {
  it('moves focus to the new heading on route change, but not on first mount', () => {
    const { rerender } = render(
      <Shell>
        <h1>Bookings</h1>
      </Shell>,
    );
    // The initial document load keeps the browser's own focus.
    expect(screen.getByRole('heading', { name: 'Bookings' })).not.toHaveFocus();

    h.pathname = '/calendar';
    rerender(
      <Shell>
        <h1>Your calendar</h1>
      </Shell>,
    );
    expect(screen.getByRole('heading', { name: 'Your calendar' })).toHaveFocus();
  });

  it('does not steal focus on first mount under StrictMode (double-invoked effects)', () => {
    render(
      <StrictMode>
        <Shell>
          <h1>Bookings</h1>
        </Shell>
      </StrictMode>,
    );
    // StrictMode double-invokes the effect on mount; keying off the previous
    // pathname (equal across the double-invoke) keeps it a no-op.
    expect(screen.getByRole('heading', { name: 'Bookings' })).not.toHaveFocus();
  });

  it('falls back to the main landmark when the new page has no heading yet', () => {
    const { rerender } = render(
      <Shell>
        <h1>Bookings</h1>
      </Shell>,
    );
    h.pathname = '/dashboard';
    rerender(
      <Shell>
        <div role="status">Loading your dashboard</div>
      </Shell>,
    );
    expect(document.getElementById('main')).toHaveFocus();
  });

  it('moves focus when entering a shell route from a flat route', () => {
    // The P1 the group-layout version missed: a client nav from a non-group
    // route (e.g. a mentor profile) into a shell route. The manager has been
    // mounted the whole time, so this is a real route change — not a first
    // mount — and focus moves to the new heading instead of falling to <body>.
    h.pathname = '/mentors/ada';
    const { rerender } = render(
      <Shell>
        <h1>Ada Lovelace</h1>
      </Shell>,
    );
    h.pathname = '/bookings';
    rerender(
      <Shell>
        <h1>Bookings</h1>
      </Shell>,
    );
    expect(screen.getByRole('heading', { name: 'Bookings' })).toHaveFocus();
  });

  it('a redirect that asked to be skipped leaves focus alone; the next navigation moves it', () => {
    const { rerender } = render(
      <Shell>
        <h1>Settings</h1>
      </Shell>,
    );
    // /settings sends the role to its first tab as the page loads.
    skipNextRouteFocus();
    h.pathname = '/settings/booking';
    rerender(
      <Shell>
        <h1>Settings</h1>
      </Shell>,
    );
    expect(screen.getByRole('heading', { name: 'Settings' })).not.toHaveFocus();

    h.pathname = '/calendar';
    rerender(
      <Shell>
        <h1>Your calendar</h1>
      </Shell>,
    );
    expect(screen.getByRole('heading', { name: 'Your calendar' })).toHaveFocus();
  });
});
