import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/lib/api/data/errors';
import { toBehaviour, toFunnel, type Funnel } from '@/lib/api/data/adminAnalytics';
import { mockBehaviour, mockFunnel, mockWindow } from '@/lib/api/mock/adminAnalytics';
import { BehaviourTab, funnelRows, safeReplayUrl, type TabQuery } from './BehaviourTab';

const c = mockWindow({ window: '30d' })!;
/** A funnel from plain steps: all primary, no figures (the v1 shape). */
const steps = (list: Omit<Funnel['steps'][number], 'layer'>[]): Funnel =>
  toFunnel({ steps: list } as Parameters<typeof toFunnel>[0]);

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
    funnelQuery: ready(toFunnel(mockFunnel('signup', 'all', c))),
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

  it('the breakdown offers that funnel’s options; Mentor activation: all, invite, direct (v2)', async () => {
    renderTab({
      funnel: 'mentor_activation',
      funnelQuery: ready(toFunnel(mockFunnel('mentor_activation', 'all', c))),
    });
    const select = screen.getByRole('combobox', { name: 'Break down by' });
    expect(select).toHaveTextContent('All mentors');
    await userEvent.click(select);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveAccessibleName(/^All mentors/);
    expect(options[1]).toHaveAccessibleName(/^Invite/);
    expect(options[2]).toHaveAccessibleName(/^Direct/);
  });

  it('a breakdown pick is sent up', async () => {
    const p = renderTab();
    await userEvent.click(screen.getByRole('combobox', { name: 'Break down by' }));
    await userEvent.click(screen.getByRole('option', { name: 'Source: migrated (log in again)' }));
    expect(p.onBy).toHaveBeenCalledWith('migrated');
  });

  it('reads every step and count, Start first, then the drop from the step before', () => {
    renderTab({
      funnelQuery: ready(
        steps([
          { key: 'a', label: 'Started sign-up', value: 640, previous: null },
          { key: 'b', label: 'Code verified', value: 498, previous: null },
        ]),
      ),
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

  it('a step nothing tracks reads No data with no bar, and no drop into or out of it', () => {
    const rows = funnelRows([
      { key: 'a', label: 'A', value: 100, previous: null },
      { key: 'b', label: 'B', value: null, previous: null },
      { key: 'c', label: 'C', value: 40, previous: null },
      { key: 'd', label: 'D', value: 30, previous: null },
    ]);
    expect(rows.map((r) => [r.count, r.width, r.drop])).toEqual([
      ['100', 100, 'Start'],
      ['No data', 0, ''],
      ['40', 40, ''],
      ['30', 30, '25% dropped'],
    ]);
  });

  it('a 0 before an untracked step, and two untracked steps in a row', () => {
    const zeroThenNull = funnelRows([
      { key: 'a', label: 'A', value: 100, previous: null },
      { key: 'b', label: 'B', value: 0, previous: null },
      { key: 'c', label: 'C', value: null, previous: null },
      { key: 'd', label: 'D', value: 10, previous: null },
    ]);
    expect(zeroThenNull.map((r) => r.drop)).toEqual(['Start', '100% dropped', '', '']);
    const twoNulls = funnelRows([
      { key: 'a', label: 'A', value: 100, previous: null },
      { key: 'b', label: 'B', value: null, previous: null },
      { key: 'c', label: 'C', value: null, previous: null },
      { key: 'd', label: 'D', value: 20, previous: null },
    ]);
    expect(twoNulls.map((r) => [r.count, r.width, r.drop])).toEqual([
      ['100', 100, 'Start'],
      ['No data', 0, ''],
      ['No data', 0, ''],
      ['20', 20, ''],
    ]);
  });

  it('a funnel whose first step nothing tracks reads as empty, in its card', () => {
    renderTab({
      funnelQuery: ready(steps([{ key: 'a', label: 'A', value: null, previous: null }])),
    });
    expect(screen.getByRole('heading', { name: 'No data for this period' })).toBeInTheDocument();
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

  it('names every profile-view source in our words, most first', () => {
    renderTab();
    expect(screen.getByText('Invite link').nextSibling).toHaveTextContent('14%');
    expect(screen.getByText('Explore').nextSibling).toHaveTextContent('46%');
  });

  it('a rate with nothing to divide by reads No data, never 0%', () => {
    const b = toBehaviour(mockBehaviour(c));
    renderTab({
      eventsQuery: ready({
        ...b,
        login: { ...b.login, failedRate: null },
        app: { ...b.app, pushAllowedRate: null },
        profileViewsBySource: [{ source: 'similar_mentors', share: null }],
      }),
    });
    expect(screen.getByText('Codes failed').nextSibling).toHaveTextContent('No data');
    expect(screen.getByText('Push allowed').nextSibling).toHaveTextContent(/^No data$/);
    expect(screen.getByText('Similar mentors').nextSibling).toHaveTextContent('No data');
  });

  it('no replay list set: no link', () => {
    renderTab({ eventsQuery: ready({ ...toBehaviour(mockBehaviour(c)), replaysUrl: null }) });
    expect(screen.queryByRole('link', { name: /Open replays/ })).toBeNull();
    expect(safeReplayUrl(null)).toBeNull();
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
  ])('%s answering 503 shows the failed-to-load state and hides the rest', async (_, over) => {
    renderTab(over);
    // The admin failed-to-load state (owner, 2026-11-12), not a notice, inside the Funnels region.
    const region = screen.getByRole('region', { name: 'Funnels' });
    expect(
      within(region).getByRole('heading', { name: 'Funnels aren’t available right now' }),
    ).toBeInTheDocument();
    expect(
      within(region).getByText(/They come from PostHog, which isn’t answering/),
    ).toBeInTheDocument();
    expect(within(region).queryByRole('note')).toBeNull();
    // Try again retries what failed.
    await userEvent.click(within(region).getByRole('button', { name: 'Try again' }));
    const q = Object.values(over)[0] as TabQuery<never>;
    expect(q.onRetry).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('radiogroup', { name: 'Funnel' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Log-in codes' })).toBeNull();
    expect(screen.queryByRole('link', { name: /Open replays/ })).toBeNull();
  });

  it('Try again retries every failed read, not only the PostHog one (review on PR 581)', async () => {
    const funnelQuery = failed<never>(upstream);
    const eventsQuery = failed<never>(new ApiError(500, 'Server error'));
    renderTab({ funnelQuery, eventsQuery });
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(funnelQuery.onRetry).toHaveBeenCalledTimes(1);
    expect(eventsQuery.onRetry).toHaveBeenCalledTimes(1);
  });

  it('a plain 503 (a proxy, not PostHog) is an ordinary failure with Try again', () => {
    renderTab({ funnelQuery: failed<never>(new ApiError(503, 'Service Unavailable')) });
    expect(screen.queryByText(/They come from PostHog/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('v2: the outcome layer follows the milestones, then the figures beside the funnel', () => {
    renderTab({
      funnel: 'mentor_activation',
      funnelQuery: ready(toFunnel(mockFunnel('mentor_activation', 'all', c))),
    });
    expect(
      screen.getByRole('img', {
        name: /^Mentor activation funnel: Approved 12, Availability set 11, Session created 7$/,
      }),
    ).toBeInTheDocument();
    // Drop-off carries on into the outcome: 7 created, then 6 with a first booking.
    expect(
      screen.getByRole('img', {
        name: 'Mentor activation, what happened next: First booking (30 days) 6, First session (30 days) 3',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('14% dropped')).toBeInTheDocument();
    const figures = screen.getByLabelText('Mentor activation: beside the funnel');
    expect(within(figures).getByText('Days to bookable').nextSibling).toHaveTextContent('2.5 days');
    expect(
      within(figures).getByText('Connected a calendar (of approved)').nextSibling,
    ).toHaveTextContent('41.7%');
    // PostHog not configured or failed: the figure says so, the funnel still shows.
    expect(
      within(figures).getByText('Shared their profile link (of approved, with analytics on)')
        .nextSibling,
    ).toHaveTextContent('No data');
  });

  it('a funnel with one layer and no figures shows neither the outcome label nor the figures', () => {
    renderTab({ funnelQuery: ready(toFunnel(mockFunnel('signup', 'all', c))) });
    expect(screen.queryByText('Then')).toBeNull();
    expect(screen.queryByRole('definition')).toBeNull();
  });

  it('a funnel nobody started reads as empty, in its card', () => {
    renderTab({ funnelQuery: ready(steps([])) });
    expect(screen.getByRole('heading', { name: 'No data for this period' })).toBeInTheDocument();
  });
});
