import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  mockBehaviour,
  mockFunnel,
  mockSection,
  mockWindow,
  type MockQuery,
} from '@/lib/api/mock/adminAnalytics';
import { admin, renderScreen, res } from '../../_test/adminHarness';

const h = vi.hoisted(() => ({
  GET: vi.fn(),
  params: new URLSearchParams(),
  listeners: new Set<() => void>(),
}));
vi.mock('@/lib/api/data/http', () => ({ api: { GET: h.GET } }));
// The account's zone is neither UTC nor the machine's: the default must come from it.
vi.mock('@/lib/api/data/viewer', () => ({
  useViewer: () => admin({ timeZone: 'Africa/Lagos' }),
}));
// The header's controls have their own tests; this file is about Behaviour.
vi.mock('./WindowControls', () => ({ WindowControls: () => null }));
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

const queryOf = (init: unknown) =>
  ((init as { params?: { query?: Record<string, string> } })?.params?.query ?? {}) as Record<
    string,
    string
  >;

/** The funnel the typed client asked for: `{name}` travels as a path parameter. */
const funnelOf = (init: unknown) =>
  (init as { params?: { path?: { name?: string } } })?.params?.path?.name;
const FUNNEL = '/api/v1/admin/analytics/funnels/{name}';

function serve() {
  h.GET.mockImplementation(async (path: string, init: unknown) => {
    const q = queryOf(init);
    const c = mockWindow(q as MockQuery)!;
    if (path === '/api/v1/admin/analytics/overview') return res(mockSection('overview', c, false));
    if (path === '/api/v1/admin/analytics/behaviour') return res(mockBehaviour(c));
    if (path === FUNNEL) return res(mockFunnel(funnelOf(init)!, q.by ?? 'all', c));
    return res(null, 404);
  });
}

beforeEach(() => {
  h.GET.mockReset();
  replace.mockClear();
});

describe('Admin Analytics: Behaviour', () => {
  it('asks for the funnel and breakdown in the URL', async () => {
    h.params = new URLSearchParams('tab=funnels&funnel=booking&by=explore');
    serve();
    renderScreen(<AdminAnalyticsScreen />);
    await screen.findByRole('img', { name: /^Booking funnel:/ });
    const funnelCalls = h.GET.mock.calls.filter(([p]) => p === FUNNEL);
    expect(funnelOf(funnelCalls[0]![1])).toBe('booking');
    expect(queryOf(funnelCalls[0]![1])).toEqual({
      window: '30d',
      compare: 'false',
      tz: 'Africa/Lagos',
      by: 'explore',
    });
    expect(screen.getByRole('combobox', { name: 'Started from' })).toHaveTextContent('Explore');
  });

  it('a breakdown the funnel does not offer is never asked for', async () => {
    // Mentor application offers only All applicants.
    h.params = new URLSearchParams('tab=funnels&funnel=mentor_application&by=invite');
    serve();
    renderScreen(<AdminAnalyticsScreen />);
    await screen.findByRole('img', { name: /^Mentor application funnel:/ });
    const call = h.GET.mock.calls.find(([p]) => p === FUNNEL)!;
    expect(queryOf(call[1]).by).toBe('all');
    expect(screen.getByRole('combobox', { name: 'Break down by' })).toHaveTextContent(
      'All applicants',
    );
  });

  it('another funnel starts from its whole audience', async () => {
    h.params = new URLSearchParams('tab=funnels&by=migrated');
    serve();
    renderScreen(<AdminAnalyticsScreen />);
    const chips = await screen.findByRole('radiogroup', { name: 'Funnel' });
    await userEvent.click(within(chips).getByRole('radio', { name: 'Mentee activation' }));
    expect(replace).toHaveBeenLastCalledWith(
      '/admin/analytics?tab=funnels&funnel=mentee_activation',
      {
        scroll: false,
      },
    );
    await waitFor(() =>
      expect(h.GET).toHaveBeenCalledWith(
        FUNNEL,
        expect.objectContaining({
          params: expect.objectContaining({ path: { name: 'mentee_activation' } }),
        }),
      ),
    );
  });
});
