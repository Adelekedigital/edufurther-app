import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/lib/api/data/errors';
import { toBehaviour } from '@/lib/api/data/adminAnalytics';
import { mockBehaviour, mockFunnel, mockWindow } from '@/lib/api/mock/adminAnalytics';
import { BehaviourTab, funnelRows, safeReplayUrl, type TabQuery } from './BehaviourTab';

const c = mockWindow({ window: '30d' })!;
const ready = <T,>(data: T): TabQuery<T> => ({
  status: 'ready',
  data,
  error: null,
  onRetry: vi.fn(),
  retrying: false,
});
const failed = <T,>(error: unknown): TabQuery<T> => ({
  status: 'error',
  data: undefined,
  error,
  onRetry: vi.fn(),
  retrying: false,
});
const upstream = new ApiError(503, 'PostHog unavailable', '/problems/analytics-upstream');

function renderTab(over: Partial<Parameters<typeof BehaviourTab>[0]> = {}) {
  const props = {
    funnel: 'signup' as const,
    by: 'all',
    onFunnel: vi.fn(),
    onBy: vi.fn(),
    funnelQuery: ready(mockFunnel('signup', 'all', c).steps),
    eventsQuery: ready(toBehaviour(mockBehaviour(c))),
    ...over,
  };
  render(<BehaviourTab {...props} />);
  return props;
}

describe('BehaviourTab: the funnel', () => {
  it('chips pick a funnel', async () => {
    const p = renderTab();
    const chips = screen.getByRole('radiogroup', { name: 'Funnel' });
    expect(within(chips).getByRole('radio', { name: 'Sign-up' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await userEvent.click(within(chips).getByRole('radio', { name: 'Booking' }));
    expect(p.onFunnel).toHaveBeenCalledWith('booking');
  });

  it('the breakdown offers that funnel’s options; Mentor activation has All mentors only', async () => {
    renderTab({
      funnel: 'mentor_activation',
      funnelQuery: ready(mockFunnel('mentor_activation', 'all', c).steps),
    });
    const select = screen.getByRole('combobox', { name: 'Break down by' });
    expect(select).toHaveTextContent('All mentors');
    await userEvent.click(select);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveAccessibleName(/^All mentors/);
  });

  it('a breakdown pick is sent up', async () => {
    const p = renderTab();
    await userEvent.click(screen.getByRole('combobox', { name: 'Break down by' }));
    await userEvent.click(screen.getByRole('option', { name: 'Source: migrated (log in again)' }));
    expect(p.onBy).toHaveBeenCalledWith('migrated');
  });

  it('reads every step and count, Start first, then the drop from the step before', () => {
    renderTab({
      funnelQuery: ready([
        { key: 'a', label: 'Started sign-up', value: 640, previous: null },
        { key: 'b', label: 'Code verified', value: 498, previous: null },
      ]),
    });
    expect(
      screen.getByRole('img', { name: 'Sign-up funnel: Started sign-up 640, Code verified 498' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('22% dropped')).toBeInTheDocument();
    expect(screen.getByText(/^One sign-up funnel for both roles/)).toBeInTheDocument();
  });

  it('a step after an empty one drops nothing, and bars stay at 0 with no first step', () => {
    const rows = funnelRows([
      { key: 'a', label: 'A', value: 0, previous: null },
      { key: 'b', label: 'B', value: 0, previous: null },
    ]);
    expect(rows.map((r) => [r.width, r.drop])).toEqual([
      [0, 'Start'],
      [0, '0% dropped'],
    ]);
  });

  it('a funnel that failed offers Try again in its card, not the PostHog notice', async () => {
    const funnelQuery = failed<never>(new ApiError(500));
    renderTab({ funnelQuery });
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(funnelQuery.onRetry).toHaveBeenCalled();
    expect(screen.queryByText(/isn’t answering/)).toBeNull();
    expect(screen.getByRole('heading', { name: 'Log-in codes' })).toBeInTheDocument();
  });
});

describe('BehaviourTab: event cards and replays', () => {
  it('shows the seven cards with their numbers', () => {
    renderTab();
    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual([
      'Log-in codes',
      'Search',
      'Profile views by source',
      'Joining sessions',
      'Writing assist',
      'App install and push',
      'Errors by screen',
    ]);
    expect(screen.getByText('Failed, migrated users').nextSibling).toHaveTextContent('11.8%');
    expect(screen.getByText('Median click before start').nextSibling).toHaveTextContent('3 min');
    expect(screen.getByText('Push allowed').nextSibling).toHaveTextContent('47% of members');
    expect(screen.getByText('/bookings')).toBeInTheDocument();
  });

  it('opens an https replay list in a new tab', () => {
    renderTab();
    const link = screen.getByRole('link', { name: 'Open replays in PostHog (opens in a new tab)' });
    expect(link).toHaveAttribute('href', 'https://eu.posthog.com/replay/recent');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('never links an address that isn’t https', () => {
    renderTab({
      eventsQuery: ready({ ...toBehaviour(mockBehaviour(c)), replaysUrl: 'javascript:alert(1)' }),
    });
    expect(screen.queryByRole('link', { name: /Open replays/ })).toBeNull();
    expect(safeReplayUrl('http://posthog.example')).toBeNull();
    expect(safeReplayUrl('not a url')).toBeNull();
    expect(safeReplayUrl('https://eu.posthog.com/replay')).toBe('https://eu.posthog.com/replay');
  });
});

describe('BehaviourTab: PostHog down', () => {
  it.each([
    ['the funnel', { funnelQuery: failed<never>(upstream) }],
    ['the events', { eventsQuery: failed<never>(upstream) }],
  ])('%s answering 503 shows the notice and hides the rest', (_, over) => {
    renderTab(over);
    expect(
      screen.getByText(/Funnels come from PostHog, which isn’t answering/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: 'Funnel' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Log-in codes' })).toBeNull();
    expect(screen.queryByRole('link', { name: /Open replays/ })).toBeNull();
  });

  it('a plain 503 (a proxy, not PostHog) is an ordinary failure with Try again', () => {
    renderTab({ funnelQuery: failed<never>(new ApiError(503, 'Service Unavailable')) });
    expect(screen.queryByText(/Funnels come from PostHog/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('a funnel nobody started reads as empty, in its card', () => {
    renderTab({ funnelQuery: ready([]) });
    expect(screen.getByRole('heading', { name: 'No data for this period' })).toBeInTheDocument();
  });
});
