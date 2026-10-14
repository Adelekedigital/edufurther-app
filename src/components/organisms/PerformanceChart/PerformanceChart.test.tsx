import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PerformanceChart } from './PerformanceChart';
import type { ChartSeries } from './model';

const months = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(Date.UTC(2025, i, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
});
const series: ChartSeries[] = [
  { key: 'completed', label: 'Completed', color: 'var(--blue-500)', values: [0, 1, 2, 1, 3, 2, 4, 3, 5, 2, 6, 4] },
  { key: 'canceled', label: 'Canceled', color: 'var(--blue-200)', values: [0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0] },
  { key: 'missed', label: 'Missed', color: 'var(--orange-500)', values: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1] },
];
const zero = series.map((s) => ({ ...s, values: s.values.map(() => 0) }));

describe('PerformanceChart', () => {
  it('renders a labelled chart, a time-range radiogroup and a legend', () => {
    render(<PerformanceChart series={series} months={months} />);
    expect(screen.getByRole('img', { name: /Session performance/ })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Time range' })).toBeInTheDocument();
    // Default range is 6M.
    expect(screen.getByRole('radio', { name: '6M' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: /Completed/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches range on click', async () => {
    const user = userEvent.setup();
    render(<PerformanceChart series={series} months={months} />);
    await user.click(screen.getByRole('radio', { name: '3M' }));
    expect(screen.getByRole('radio', { name: '3M' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: '6M' })).toHaveAttribute('aria-checked', 'false');
  });

  it('moves the range with arrow keys (radiogroup)', async () => {
    const user = userEvent.setup();
    render(<PerformanceChart series={series} months={months} />);
    screen.getByRole('radio', { name: '6M' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: '12M' })).toHaveAttribute('aria-checked', 'true');
  });

  it('toggles a series off from the legend', async () => {
    const user = userEvent.setup();
    render(<PerformanceChart series={series} months={months} />);
    const canceled = screen.getByRole('button', { name: /Canceled/ });
    await user.click(canceled);
    expect(canceled).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows the empty state when there are no sessions', () => {
    render(<PerformanceChart series={zero} months={months} />);
    expect(screen.getByText('No sessions yet')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Session performance/ })).not.toBeInTheDocument();
  });
});
