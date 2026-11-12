import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toOverview, type Overview } from '@/lib/api/data/adminAnalytics';
import { mockSection, mockWindow } from '@/lib/api/mock/adminAnalytics';
import { formatDay } from '@/lib/utils/format';
import { isOverviewEmpty, OverviewTab, type OverviewRole, type OverviewShow } from './OverviewTab';

const data = (compare = true): Overview =>
  toOverview(mockSection('overview', mockWindow({ compare: String(compare) })!, false));

const show = (
  d: Overview,
  compare = true,
  onOpen = vi.fn(),
  view: OverviewShow = 'northStar',
  onShow = vi.fn(),
  role: OverviewRole = 'all',
  onRole = vi.fn(),
) =>
  render(
    <OverviewTab
      data={d}
      compare={compare}
      windowLabel="Last 30 days"
      show={view}
      onShow={onShow}
      role={role}
      onRole={onRole}
      onOpen={onOpen}
    />,
  );

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

  it('North Star view: three sub-tracks, no active members, no note', () => {
    show(data());
    const ns = screen.getByRole('region', { name: 'Platform North Star' });
    expect(within(ns).getByText('Unique mentees served')).toBeInTheDocument();
    expect(within(ns).queryByText('Weekly active members')).toBeNull();
    expect(within(ns).queryByText(/history starts on/)).toBeNull();
  });

  it('Show switches the card to Active members (owner pick B)', async () => {
    const onShow = vi.fn();
    show(data(), true, vi.fn(), 'northStar', onShow);
    await userEvent.click(screen.getByRole('combobox', { name: 'Show' }));
    await userEvent.click(screen.getByRole('option', { name: 'Active members' }));
    expect(onShow).toHaveBeenCalledWith('active');
  });

  it('Active members: weekly active as the headline, the trend, the split by role and the note', () => {
    const d = data();
    show(d, true, vi.fn(), 'active');
    const card = screen.getByRole('region', { name: 'Platform health' });
    expect(
      within(card).getByRole('heading', { level: 2, name: /Active members/ }),
    ).toBeInTheDocument();
    expect(within(card).getByText(`As of ${formatDay(d.to).date}`)).toBeInTheDocument();
    expect(within(card).getByText('weekly active members')).toBeInTheDocument();
    // 246 vs 221 at the end of the period before.
    expect(within(card).getByText('vs 221 at the end of the period before')).toBeInTheDocument();
    expect(
      within(card).getByRole('img', { name: /^Weekly active members per week, last 30 days/ }),
    ).toBeInTheDocument();
    const tile = (label: string) => within(card).getByText(label).parentElement!;
    expect(tile('Weekly active members').children[1]).toHaveTextContent('246');
    expect(
      within(tile('Weekly active members')).getByText('Mentees 204 · Mentors 42'),
    ).toBeInTheDocument();
    expect(
      within(tile('Monthly active members')).getByText('Mentees 521 · Mentors 91'),
    ).toBeInTheDocument();
    expect(tile('Stickiness (weekly of monthly)').children[1]).toHaveTextContent('40.2%');
    expect(
      within(tile('Stickiness (weekly of monthly)')).getByText('Monthly members back this week'),
    ).toBeInTheDocument();
    expect(
      within(card).getByText(/history starts on 12 Nov 2026\. Weekly = last 7 days/),
    ).toBeInTheDocument();
    // The North Star's sub-tracks are not in this view.
    expect(within(card).queryByText('Unique mentees served')).toBeNull();
  });

  it('Role filter: Mentors swaps every figure, the words and the trend, and drops the split', () => {
    const d = data();
    show(d, true, vi.fn(), 'active', vi.fn(), 'mentor');
    const card = screen.getByRole('region', { name: 'Platform health' });
    expect(within(card).getByRole('radio', { name: 'Mentors' })).toBeChecked();
    expect(within(card).getByText('weekly active mentors')).toBeInTheDocument();
    // Mentors: 42 vs 41.
    expect(within(card).getByText('vs 41 at the end of the period before')).toBeInTheDocument();
    const tile = (label: string) => within(card).getByText(label).parentElement!;
    expect(tile('Weekly active mentors').children[1]).toHaveTextContent('42');
    expect(tile('Monthly active mentors').children[1]).toHaveTextContent('91');
    expect(tile('Stickiness (weekly of monthly)').children[1]).toHaveTextContent('46.2%');
    expect(within(card).getByText('Monthly mentors back this week')).toBeInTheDocument();
    expect(within(card).queryByText(/Mentees \d+ · Mentors/)).toBeNull();
    expect(
      within(card).getByRole('img', { name: /^Weekly active mentors per week, last 30 days/ }),
    ).toBeInTheDocument();
  });

  it('the role control shows only in Active members, and picking one reports it', async () => {
    const onRole = vi.fn();
    const { unmount } = show(data(), true, vi.fn(), 'northStar', vi.fn(), 'all', onRole);
    expect(screen.queryByRole('radiogroup', { name: 'Role' })).toBeNull();
    unmount();
    show(data(), true, vi.fn(), 'active', vi.fn(), 'all', onRole);
    await userEvent.click(screen.getByRole('radio', { name: 'Mentees' }));
    expect(onRole).toHaveBeenCalledWith('mentee');
  });

  it('a role the response does not split reads No data', () => {
    const d = data();
    show(
      { ...d, activeMembers: { ...d.activeMembers, byRole: null } },
      true,
      vi.fn(),
      'active',
      vi.fn(),
      'mentee',
    );
    const card = screen.getByRole('region', { name: 'Platform health' });
    expect(
      within(card).getByText('Weekly active mentees').parentElement!.children[1],
    ).toHaveTextContent('No data');
  });

  it('Active members with no split, no trend and no figures: No data, no change, no chart', () => {
    const d = data();
    show(
      {
        ...d,
        subTracks: {
          ...d.subTracks,
          weeklyActive: null,
          monthlyActive: null,
          stickiness: { value: null, previous: 66.7 },
        },
        activeMembers: { byRole: null, series: null },
      },
      true,
      vi.fn(),
      'active',
    );
    const card = screen.getByRole('region', { name: 'Platform health' });
    expect(within(card).queryByRole('img')).toBeNull();
    expect(within(card).queryByText(/at the end of the period before/)).toBeNull();
    expect(within(card).queryByText('weekly active members')).toBeNull();
    for (const label of ['Weekly active members', 'Monthly active members']) {
      const t = within(card).getByText(label).parentElement!;
      expect(t.children[1]).toHaveTextContent('No data');
      // Label and value only: no change, no split.
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
        weeklyActive: { value: 0, previous: 1 },
        monthlyActive: null,
      },
    };
    // A quiet week still has Mentor supply and the other feature numbers.
    expect(isOverviewEmpty(quiet)).toBe(false);
    expect(
      isOverviewEmpty({ ...quiet, features: quiet.features.map((f) => ({ ...f, value: null })) }),
    ).toBe(true);
    // Members active with nothing else to read (review on PR 575): still a number to show.
    const noFeatures = quiet.features.map((f) => ({ ...f, value: null }));
    expect(
      isOverviewEmpty({
        ...quiet,
        features: noFeatures,
        subTracks: { ...quiet.subTracks, monthlyActive: { value: 12, previous: null } },
      }),
    ).toBe(false);
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
