import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toGrowth, type Growth } from '@/lib/api/data/adminAnalytics';
import { mockSection, mockWindow } from '@/lib/api/mock/adminAnalytics';
import { GrowthTab, isGrowthEmpty } from './GrowthTab';

const growth = (over: Partial<Growth> = {}): Growth => ({
  ...toGrowth(mockSection('growth', mockWindow({})!, false)),
  ...over,
});
const compared = () => toGrowth(mockSection('growth', mockWindow({ compare: 'true' })!, false));

describe('Growth tab', () => {
  it('shows sign-ups by role with their change', () => {
    render(<GrowthTab data={compared()} compare />);
    const section = screen.getByRole('region', { name: 'Growth' });
    // Mock, 30 days: 214 against 196.
    expect(within(section).getByText('New sign-ups, all roles').parentElement).toHaveTextContent(
      '214+9.2%',
    );
    expect(within(section).getByText('Mentors').parentElement).toHaveTextContent('38+15.2%');
  });

  it('hides the change lines with Compare off', () => {
    render(<GrowthTab data={growth()} compare={false} />);
    expect(screen.queryByText(/^\+\d/)).toBeNull();
  });

  it('says source and channel aren’t recorded yet while the lists are empty', async () => {
    render(<GrowthTab data={growth()} compare={false} />);
    expect(screen.getByText(/aren’t recorded yet/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
    await userEvent.click(screen.getByRole('radio', { name: 'Channel' }));
    expect(screen.getByRole('heading', { name: 'New members by channel' })).toBeInTheDocument();
    expect(screen.getByText(/aren’t recorded yet/)).toBeInTheDocument();
  });

  it('lists sources with the share who completed a session', () => {
    render(
      <GrowthTab
        data={growth({ bySource: [{ key: 'invite', members: 46, completedShare: 41 }] })}
        compare={false}
      />,
    );
    const table = screen.getByRole('table', { name: 'New members by source' });
    const row = within(table).getAllByRole('row')[1]!;
    expect(row).toHaveTextContent('Invite4641%');
  });

  it('members from invites: the cost sentence only with a cost, the top inviter', () => {
    const { rerender } = render(<GrowthTab data={growth()} compare={false} />);
    expect(screen.queryByText(/Credit cost/)).toBeNull();
    expect(screen.getByText('Top inviter: Amara Okafor (9 joined).')).toBeInTheDocument();
    const g = growth();
    rerender(
      <GrowthTab
        data={{ ...g, invites: { ...g.invites, costPerCompleted: 4.2 } }}
        compare={false}
      />,
    );
    expect(
      screen.getByText(
        'Credit cost per invited member who completed a session: 4.2 credits. Top inviter: Amara Okafor (9 joined).',
      ),
    ).toBeInTheDocument();
  });

  it('draws sign-ups per month as one image named by its data, the current month so far', () => {
    const g = growth();
    render(<GrowthTab data={g} compare={false} />);
    const chart = screen.getByRole('img', { name: /^New members per month: / });
    expect(chart.getAttribute('aria-label')).toMatch(/, \w{3} 37$/);
    const last = chart.lastElementChild as HTMLElement;
    expect(last.title).toMatch(/: 37 new members \(month so far\)$/);
    expect(screen.getByText('Migrated users are left out (1,204).')).toBeInTheDocument();
  });

  it('names the migration day when it is known', () => {
    render(
      <GrowthTab data={growth({ migrated: { count: 1204, on: '2026-10-01' } })} compare={false} />,
    );
    expect(screen.getByText('Migrated users are left out (1,204 on Oct 1).')).toBeInTheDocument();
  });

  it('completed sessions by topic, then by stage in the Best for order with Not set', async () => {
    render(<GrowthTab data={growth()} compare={false} />);
    expect(screen.getByText('Application documents').parentElement).toHaveTextContent('44%');
    await userEvent.click(screen.getByRole('radio', { name: 'Stage' }));
    expect(
      screen.getByRole('heading', { name: 'Completed sessions by stage' }),
    ).toBeInTheDocument();
    const labels = [
      'Exploring',
      'Researching schools & scholarships',
      'Preparing documents',
      'Applying',
      'Preparing for interview',
      'Waiting for a decision',
      'Not set',
    ];
    labels.forEach((l) => expect(screen.getByText(l)).toBeInTheDocument());
    expect(screen.getByText('Exploring').parentElement).toHaveTextContent('46%');
    expect(screen.getByText(/more than one stage/)).toBeInTheDocument();
  });

  it('is empty only when nothing happened', () => {
    const g = growth();
    expect(isGrowthEmpty(g)).toBe(false);
    expect(
      isGrowthEmpty({
        ...g,
        signups: { ...g.signups, all: { value: 0, previous: null } },
        invites: { ...g.invites, invited: 0 },
        completedTotal: 0,
        months: g.months.map((m) => ({ ...m, count: 0 })),
      }),
    ).toBe(true);
  });
});
