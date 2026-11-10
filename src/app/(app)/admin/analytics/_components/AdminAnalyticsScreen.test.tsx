import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockSection, mockWindow } from '@/lib/api/mock/adminAnalytics';
import { todayIn } from '@/lib/utils/calendar';
import { admin, renderScreen, res } from '../../_test/adminHarness';

const h = vi.hoisted(() => ({
  GET: vi.fn(),
  params: new URLSearchParams(),
  listeners: new Set<() => void>(),
}));
vi.mock('@/lib/api/data/http', () => ({ api: { GET: h.GET } }));
vi.mock('@/lib/api/data/viewer', () => ({ useViewer: () => admin() }));
vi.mock('next/navigation', async () => {
  const { useSyncExternalStore } = await import('react');
  const subscribe = (fn: () => void) => {
    h.listeners.add(fn);
    return () => h.listeners.delete(fn);
  };
  return {
    useSearchParams: () => useSyncExternalStore(subscribe, () => h.params),
    useRouter: () => ({ replace }),
    usePathname: () => '/admin/analytics',
  };
});
const replace = vi.fn((url: string) => {
  h.params = new URLSearchParams(url.split('?')[1] ?? '');
  h.listeners.forEach((fn) => fn());
});

const { AdminAnalyticsScreen } = await import('./AdminAnalyticsScreen');

type Query = Record<string, string>;
const queryOf = (init: unknown) =>
  ((init as { params?: { query?: Query } })?.params?.query ?? {}) as Query;

/** Answers every section from the mock, by the query it was asked with. */
function serve(over: Partial<Record<string, (q: Query) => unknown>> = {}) {
  h.GET.mockImplementation(async (path: string, init: unknown) => {
    const q = queryOf(init);
    const section = path.replace('/api/v1/admin/analytics/', '');
    if (over[section]) return over[section]!(q);
    const c = mockWindow(q);
    if (!c) return res({ type: '/problems/analytics-window' }, 422);
    if (['overview', 'sessions', 'supply', 'credits', 'growth'].includes(section)) {
      return res(mockSection(section as 'credits', c, false));
    }
    return res(null, 404);
  });
}
const calls = (section: string) =>
  h.GET.mock.calls
    .filter(([p]) => p === `/api/v1/admin/analytics/${section}`)
    .map(([, i]) => queryOf(i));

beforeEach(() => {
  h.GET.mockReset();
  replace.mockClear();
  h.params = new URLSearchParams('tab=credits');
});

describe('Admin Analytics: the page', () => {
  it('shows the header, the window (30 days), Compare on, the tabs and the footer', async () => {
    serve();
    renderScreen(<AdminAnalyticsScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Analytics' })).toBeInTheDocument();
    const windows = screen.getByRole('radiogroup', { name: 'Time window' });
    expect(within(windows).getByRole('radio', { name: '30 days' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Compare with previous period' })).toBeChecked();
    expect(screen.getByRole('tab', { name: 'Credits', selected: true })).toBeInTheDocument();
    expect(screen.getByText(/All dates and times in UTC/)).toBeInTheDocument();
    await screen.findByRole('heading', { level: 2, name: 'Credits' });
    expect(calls('credits')[0]).toEqual({ window: '30d', compare: 'true' });
  });

  it('asks again for 7 days, and with Compare off', async () => {
    serve();
    renderScreen(<AdminAnalyticsScreen />);
    await screen.findByRole('heading', { level: 2, name: 'Credits' });
    await userEvent.click(screen.getByRole('radio', { name: '7 days' }));
    await waitFor(() => expect(calls('credits')).toContainEqual({ window: '7d', compare: 'true' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Compare with previous period' }));
    await waitFor(() =>
      expect(calls('credits')).toContainEqual({ window: '7d', compare: 'false' }),
    );
  });

  it('Custom opens Choose dates; nothing changes until a day is applied', async () => {
    serve();
    renderScreen(<AdminAnalyticsScreen />);
    await screen.findByRole('heading', { level: 2, name: 'Credits' });
    await userEvent.click(screen.getByRole('radio', { name: 'Custom' }));
    const dialog = await screen.findByRole('dialog', { name: 'Choose dates' });
    const apply = within(dialog).getByRole('button', { name: 'Apply dates' });
    expect(apply).toBeDisabled();
    const today = todayIn('UTC');
    const name = new Date(`${today}T12:00:00Z`).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
    await userEvent.click(within(dialog).getByRole('button', { name }));
    await userEvent.click(apply);
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() =>
      expect(calls('credits')).toContainEqual({ from: today, to: today, compare: 'true' }),
    );
    const short = new Date(`${today}T12:00:00Z`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
    expect(screen.getByRole('radio', { name: short })).toBeChecked();
  });

  it('Cancel leaves the window as it was', async () => {
    serve();
    renderScreen(<AdminAnalyticsScreen />);
    await screen.findByRole('heading', { level: 2, name: 'Credits' });
    await userEvent.click(screen.getByRole('radio', { name: 'Custom' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('radio', { name: '30 days' })).toBeChecked();
  });

  it('a tab moves the URL', async () => {
    serve();
    renderScreen(<AdminAnalyticsScreen />);
    await userEvent.click(screen.getByRole('tab', { name: 'Overview' }));
    expect(replace).toHaveBeenLastCalledWith('/admin/analytics', { scroll: false });
    expect(screen.getByRole('tab', { name: 'Overview', selected: true })).toBeInTheDocument();
  });
});

describe('Admin Analytics: what loads, and the keyboard', () => {
  it('only the open tab asks', async () => {
    serve();
    renderScreen(<AdminAnalyticsScreen />);
    await screen.findByRole('heading', { level: 2, name: 'Credits' });
    const asked = new Set(h.GET.mock.calls.map(([p]) => p));
    expect([...asked]).toEqual(['/api/v1/admin/analytics/credits']);
  });

  it('a key pressed on Compare never swallows the next click on Custom', async () => {
    serve();
    renderScreen(<AdminAnalyticsScreen />);
    await screen.findByRole('heading', { level: 2, name: 'Credits' });
    screen.getByRole('checkbox', { name: 'Compare with previous period' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    await userEvent.click(screen.getByRole('radio', { name: 'Custom' }));
    expect(await screen.findByRole('dialog', { name: 'Choose dates' })).toBeInTheDocument();
  });

  it('arrowing over Custom selects nothing and opens nothing; Enter opens the picker', async () => {
    serve();
    renderScreen(<AdminAnalyticsScreen />);
    await screen.findByRole('heading', { level: 2, name: 'Credits' });
    await userEvent.click(screen.getByRole('radio', { name: '90 days' }));
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('radio', { name: '90 days' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Custom' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByRole('dialog', { name: 'Choose dates' })).toBeInTheDocument();
  });
});

describe('Admin Analytics: states', () => {
  it('loading says so while the tab is on its way', async () => {
    h.GET.mockImplementation(() => new Promise(() => {}));
    renderScreen(<AdminAnalyticsScreen />);
    expect(await screen.findByRole('status', { name: 'Loading analytics' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });

  it('an error offers Try again, which loads the tab', async () => {
    let fail = true;
    serve({
      credits: (q) => (fail ? res({}, 500) : res(mockSection('credits', mockWindow(q)!, false))),
    });
    renderScreen(<AdminAnalyticsScreen />);
    // A 5xx is retried once before the error shows.
    expect(
      await screen.findByRole('heading', { name: 'We couldn’t load analytics' }, { timeout: 4000 }),
    ).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Credits' })).toBeInTheDocument();
  });

  it('a window where nothing happened is empty', async () => {
    serve({
      credits: (q) => {
        const d = mockSection('credits', mockWindow(q)!, false);
        return res({
          ...d,
          flow: { granted: 0, spent: 0, refunded: 0, expired: 0 },
          by_source: d.by_source.map((r) => ({
            ...r,
            granted: 0,
            spent: 0,
            refunded: 0,
            expired: 0,
          })),
        });
      },
    });
    renderScreen(<AdminAnalyticsScreen />);
    expect(
      await screen.findByRole('heading', { name: 'No data for this period' }),
    ).toBeInTheDocument();
  });

  it('several alerts show newest first, each link named by the view it opens', async () => {
    serve({
      credits: (q) => {
        const d = mockSection('credits', mockWindow(q)!, false);
        return res({
          ...d,
          alerts: [
            {
              key: 'no_booking_requests',
              title: 'No booking requests',
              body: 'No booking requests in the last 24 hours.',
              link: { tab: 'sessions' },
              raised_at: '2026-11-08T06:00:00Z',
            },
            {
              key: 'login_code_failed',
              title: 'Log-in codes failing',
              body: '12% of log-in attempts failed yesterday (alert at 10%).',
              link: { tab: 'funnels', funnel: 'signup', by: 'migrated' },
              raised_at: '2026-11-09T06:00:00Z',
            },
          ],
        });
      },
    });
    renderScreen(<AdminAnalyticsScreen />);
    await screen.findByRole('heading', { level: 2, name: 'Credits' });
    // A count beside the title, said once; no banner in the page.
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('2 alerts firing')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '2 alerts' }));
    const items = within(screen.getByRole('dialog', { name: 'Alerts' })).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Log-in codes failing');
    expect(within(items[1]!).getByRole('button', { name: 'See sessions' })).toBeInTheDocument();
    await userEvent.click(
      within(items[0]!).getByRole('button', { name: 'See the sign-up funnel' }),
    );
    expect(replace).toHaveBeenLastCalledWith('/admin/analytics?tab=funnels&by=migrated', {
      scroll: false,
    });
    // The list closes (focus going back to the count is AlertsButton's test).
    expect(screen.queryByRole('dialog', { name: 'Alerts' })).toBeNull();
  });

  it('the mock alerts open from the count, and a link opens the sign-up funnel', async () => {
    serve({ credits: (q) => res(mockSection('credits', mockWindow(q)!, true)) });
    renderScreen(<AdminAnalyticsScreen />);
    await userEvent.click(await screen.findByRole('button', { name: '2 alerts' }));
    const list = screen.getByRole('dialog', { name: 'Alerts' });
    expect(list).toHaveTextContent('No sign-ups');
    expect(list).toHaveTextContent('No one has signed up in the last 24 hours.');
    await userEvent.click(within(list).getByRole('button', { name: 'See the sign-up funnel' }));
    expect(replace).toHaveBeenLastCalledWith('/admin/analytics?tab=funnels', { scroll: false });
  });

  it('with no alerts there is no count', async () => {
    serve();
    renderScreen(<AdminAnalyticsScreen />);
    await screen.findByRole('heading', { level: 2, name: 'Credits' });
    expect(screen.queryByRole('button', { name: /alerts?$/ })).toBeNull();
  });
});

describe('Admin Analytics: Credits', () => {
  it('shows the four flow cards and the table by source', async () => {
    serve();
    renderScreen(<AdminAnalyticsScreen />);
    const section = await screen.findByRole('region', { name: 'Credits' });
    expect(within(section).getByText('Expired unused')).toBeInTheDocument();
    expect(within(section).getAllByText(/of granted$/)).toHaveLength(2);
    const table = within(section).getByRole('table', { name: 'Credits by source' });
    const rows = within(table).getAllByRole('row');
    expect(rows.map((r) => r.firstElementChild?.textContent)).toEqual([
      'Source',
      'Monthly',
      'Level-ups',
      'Admin',
      'Refunds',
      'Carried over',
    ]);
    // Expired is a share of that source's own grants: monthly 57 of 240.
    expect(within(rows[1]!).getAllByRole('cell').at(-1)).toHaveTextContent('24%');
  });
});
