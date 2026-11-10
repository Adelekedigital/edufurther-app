import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toSupply } from '@/lib/api/data/adminAnalytics';
import { mockSection, mockWindow } from '@/lib/api/mock/adminAnalytics';
import { isSupplyEmpty, SupplyTab } from './SupplyTab';

const supply = (over: Partial<ReturnType<typeof toSupply>> = {}) => ({
  ...toSupply(mockSection('supply', mockWindow({})!, false)),
  ...over,
});

const firstCells = (table: HTMLElement) =>
  within(table)
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).getAllByRole('cell'));

describe('Supply tab', () => {
  it('shows the cohort with each step converted from the one before', () => {
    render(<SupplyTab data={supply()} />);
    const section = screen.getByRole('region', { name: 'Mentor supply' });
    expect(within(section).getByText('Database')).toBeInTheDocument();
    // Mock, 30 days: applied 38, approved 21 (55%), listed 19 (90%), bookable 11 (58%).
    expect(within(section).getByText('Applied').parentElement).toHaveTextContent(/^Applied38$/);
    expect(within(section).getByText('Approved').parentElement).toHaveTextContent('21 55%');
    expect(within(section).getByText('Bookable (now)').parentElement).toHaveTextContent('11 58%');
    expect(
      within(section).getByText(
        'Median time in review: 3.4 days. Unlisted this period: 2. Bookable = listed with a free slot in 14 days.',
      ),
    ).toBeInTheDocument();
  });

  it('drops the review sentence when there is no median', () => {
    render(<SupplyTab data={supply({ medianReviewDays: null })} />);
    expect(screen.getByText(/^Unlisted this period: 2\./)).toBeInTheDocument();
  });

  it('sorts places by mentees per mentor, with no flag or warning', () => {
    render(<SupplyTab data={supply()} />);
    const table = screen.getByRole('table', { name: 'Demand and supply by destination' });
    expect(firstCells(table).map((c) => [c[0]!.textContent, c[3]!.textContent])).toEqual([
      ['United Kingdom', '16.0'],
      ['Canada', '14.2'],
      ['United States', '7.1'],
      ['Germany', '5.5'],
      ['Ireland', '4.7'],
    ]);
    expect(screen.queryByText(/flagged/)).toBeNull();
    expect(screen.getByText('Sorted by mentees per mentor.')).toBeInTheDocument();
  });

  it('School lists schools, a school with no bookable mentor first', async () => {
    render(<SupplyTab data={supply()} />);
    await userEvent.click(screen.getByRole('radio', { name: 'School' }));
    const table = screen.getByRole('table', { name: 'Demand and supply by destination' });
    expect(within(table).getByRole('columnheader', { name: 'School' })).toBeInTheDocument();
    const first = firstCells(table)[0]!;
    expect(first[0]).toHaveTextContent('University College Dublin');
    expect(first[3]).toHaveTextContent('No mentors');
  });

  it('is empty only when nothing happened', () => {
    expect(isSupplyEmpty(supply())).toBe(false);
    expect(
      isSupplyEmpty(
        supply({
          cohort: { applied: 0, approved: 0, listed: 0, bookable: 0 },
          unlisted: 0,
          byCountry: [],
          bySchool: [],
        }),
      ),
    ).toBe(true);
  });
});
