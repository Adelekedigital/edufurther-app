import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toOverview, type Overview } from '@/lib/api/data/adminAnalytics';
import { mockSection, mockWindow } from '@/lib/api/mock/adminAnalytics';
import { isOverviewEmpty, OverviewTab } from './OverviewTab';

const data = (compare = true): Overview =>
  toOverview(mockSection('overview', mockWindow({ compare: String(compare) })!, false));

const show = (d: Overview, compare = true, onOpen = vi.fn()) =>
  render(<OverviewTab data={d} compare={compare} windowLabel="Last 30 days" onOpen={onOpen} />);

describe('OverviewTab', () => {
  it('shows the North Star with its change, the previous period and the trend', () => {
    const { container } = show(data());
    const ns = screen.getByRole('region', { name: 'Platform North Star' });
    expect(
      within(ns).getByRole('heading', { level: 2, name: /Completed sessions/ }),
    ).toBeInTheDocument();
    expect(within(ns).getByText('214')).toBeInTheDocument();
    // 214 vs 191: up 12.0%, good.
    expect(within(ns).getByText('+12.0%')).toBeInTheDocument();
    expect(within(ns).getByText('vs 191 the period before')).toBeInTheDocument();
    expect(
      within(ns).getByRole('img', { name: /^Completed sessions per week, last 30 days/ }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('svg path')).not.toHaveLength(0);
    expect(within(ns).getByText('Previous period')).toBeInTheDocument();
    expect(within(ns).getByText('Sessions per active mentee').nextSibling).toHaveTextContent(
      '1.31',
    );
  });

  it('active members (backend release 661): weekly, monthly and stickiness tiles, with the note', () => {
    show(data());
    const ns = screen.getByRole('region', { name: 'Platform North Star' });
    const tile = (label: string) => within(ns).getByText(label).parentElement!;
    expect(tile('Weekly active members').children[1]).toHaveTextContent(/^\d+$/);
    expect(tile('Monthly active members').children[1]).toHaveTextContent(/^\d+$/);
    // A percent, its change in points (40.0 vs 66.7).
    expect(tile('Stickiness (weekly of monthly)').children[1]).toHaveTextContent('40%');
    expect(
      within(tile('Stickiness (weekly of monthly)')).getByText(/26\.7 pts/),
    ).toBeInTheDocument();
    expect(
      within(ns).getByText(
        'Members who used the app while signed in; history starts on 12 Nov 2026.',
      ),
    ).toBeInTheDocument();
  });

  it('active members missing from the response (or stickiness with no monthly members) read No data, no change', () => {
    const d = data();
    show({
      ...d,
      subTracks: {
        ...d.subTracks,
        weeklyActive: null,
        monthlyActive: null,
        stickiness: { value: null, previous: 66.7 },
      },
    });
    const ns = screen.getByRole('region', { name: 'Platform North Star' });
    for (const label of [
      'Weekly active members',
      'Monthly active members',
      'Stickiness (weekly of monthly)',
    ]) {
      const t = within(ns).getByText(label).parentElement!;
      expect(t.children[1]).toHaveTextContent('No data');
      expect(t.children).toHaveLength(2);
    }
  });

  it('with Compare off hides every change line and the dashed line', () => {
    show(data(false), false);
    expect(screen.queryByText(/the period before/)).toBeNull();
    expect(screen.queryByText('Previous period')).toBeNull();
    expect(screen.queryByText(/pts$/)).toBeNull();
  });

  it('draws the seven feature cards; Explore reads "No data" with no change or sparkline', () => {
    // Explore reads PostHog: null when it isn't answering.
    const d = data();
    show({
      ...d,
      features: d.features.map((f) =>
        f.key === 'explore' ? { ...f, value: null, spark: null, contribution: null } : f,
      ),
    });
    const features = screen.getByRole('region', { name: 'Feature North Stars' });
    const cards = within(features).getAllByRole('button');
    expect(cards).toHaveLength(7);
    const explore = within(features).getByRole('button', {
      name: 'Explore and matching: No data. Open detail',
    });
    expect(explore.querySelector('svg')).toBeNull();
    expect(within(explore).getByText('PostHog')).toBeInTheDocument();
    // A "now" number: no change line (PRD Q1).
    expect(
      within(features).getByRole('button', { name: 'Mentor supply: 58%. Open detail' }),
    ).toBeInTheDocument();
    // Messaging went down 2 points: bad, with its sign.
    expect(
      within(features).getByRole('button', { name: 'Messaging: 64%, −2 pts. Open detail' }),
    ).toHaveTextContent('Feeds sessions: 58% of confirmed sessions had a message first');
  });

  it('Explore shows its rate once PostHog answers', () => {
    show(data());
    const features = screen.getByRole('region', { name: 'Feature North Stars' });
    expect(
      within(features).getByRole('button', { name: /^Explore and matching: 34%/ }),
    ).toBeInTheDocument();
  });

  it('a feature card opens its tab', async () => {
    const onOpen = vi.fn();
    show(data(), true, onOpen);
    await userEvent.click(screen.getByRole('button', { name: /^Booking:/ }));
    expect(onOpen).toHaveBeenCalledWith('sessions');
  });

  it('is empty only when nothing was completed and no feature has a number', () => {
    const d = data();
    expect(isOverviewEmpty(d)).toBe(false);
    const quiet = {
      ...d,
      northStar: {
        ...d.northStar,
        completed: { value: 0, previous: 3 },
        series: d.northStar.series.map((p) => ({ ...p, value: 0 })),
      },
      subTracks: {
        ...d.subTracks,
        uniqueMentees: { value: 0, previous: 1 },
        mentorsDelivered: { value: 0, previous: 1 },
      },
    };
    // A quiet week still has Mentor supply and the other feature numbers.
    expect(isOverviewEmpty(quiet)).toBe(false);
    expect(
      isOverviewEmpty({ ...quiet, features: quiet.features.map((f) => ({ ...f, value: null })) }),
    ).toBe(true);
    // A real 0% (no listed mentor free) is a number, not an absence.
    expect(
      isOverviewEmpty({
        ...quiet,
        features: quiet.features.map((f) => ({
          ...f,
          value: f.key === 'mentor_supply' ? { value: 0, previous: null } : null,
        })),
      }),
    ).toBe(false);
  });
});
