import { act, render, screen, within } from '@testing-library/react';
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
  { key: 'missed', label: 'Missed', color: 'var(--red-500)', values: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1] },
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

  it('reports its range on mount and when it changes (onRangeChange)', async () => {
    const user = userEvent.setup();
    const onRangeChange = vi.fn();
    render(<PerformanceChart series={series} months={months} onRangeChange={onRangeChange} />);
    expect(onRangeChange).toHaveBeenCalledWith('6m'); // the default, on mount
    onRangeChange.mockClear();
    await user.click(screen.getByRole('radio', { name: '12M' }));
    expect(onRangeChange).toHaveBeenCalledWith('12m');
  });

  it('moves the range with arrows, Home and End, wrapping, and moves focus', async () => {
    const user = userEvent.setup();
    render(<PerformanceChart series={series} months={months} />);
    screen.getByRole('radio', { name: '6M' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: '12M' })).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{ArrowRight}'); // wraps to the first
    expect(screen.getByRole('radio', { name: '3M' })).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{ArrowLeft}'); // wraps back to the last
    expect(screen.getByRole('radio', { name: '12M' })).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{Home}');
    expect(screen.getByRole('radio', { name: '3M' })).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{End}');
    const last = screen.getByRole('radio', { name: '12M' });
    expect(last).toHaveAttribute('aria-checked', 'true');
    expect(last).toHaveFocus(); // roving tabindex follows the selection
  });

  it('switching to a year via the select clears the preset radios', async () => {
    const user = userEvent.setup();
    render(<PerformanceChart series={series} months={months} />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Show a year' }), '2025');
    expect(screen.getByRole('radio', { name: '6M' })).toHaveAttribute('aria-checked', 'false');
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

  it('exposes each month column to the keyboard and screen reader', () => {
    render(<PerformanceChart series={series} months={months} />);
    // 6M range → 6 focusable columns, each named with its figures.
    const cols = screen.getAllByRole('img', { name: /\d+ completed/ });
    expect(cols).toHaveLength(6);
    cols[0]!.focus();
    expect(cols[0]).toHaveFocus();
  });
});

describe('PerformanceChart mobile dropdown legend', () => {
  // A ResizeObserver whose callback we can fire to simulate a narrow card.
  let fire: ((width: number) => void) | undefined;
  const original = globalThis.ResizeObserver;

  beforeEach(() => {
    class MockResizeObserver {
      constructor(cb: ResizeObserverCallback) {
        fire = (width: number) =>
          act(() => cb([{ contentRect: { width } } as ResizeObserverEntry], this));
      }
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  });
  afterEach(() => {
    globalThis.ResizeObserver = original;
    fire = undefined;
  });

  const narrow = () => fire!(320);
  const wide = () => fire!(800);

  it('swaps inline chips for a disclosure when the card narrows, and back', () => {
    render(<PerformanceChart series={series} months={months} mobileLegend="dropdown" />);
    // Wide to start: inline chips, no disclosure.
    expect(screen.getByRole('button', { name: /Completed/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Showing/ })).not.toBeInTheDocument();

    narrow();
    expect(screen.queryByRole('button', { name: 'Completed' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Showing/ })).toBeInTheDocument();

    wide();
    expect(screen.getByRole('button', { name: /Completed/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Showing/ })).not.toBeInTheDocument();
  });

  it('opens and closes the menu, and summarises the shown series', async () => {
    const user = userEvent.setup();
    render(<PerformanceChart series={series} months={months} mobileLegend="dropdown" />);
    narrow();
    const trigger = screen.getByRole('button', { name: /Showing/ });
    expect(trigger).toHaveTextContent('All');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('menu');
    expect(within(menu).getAllByRole('menuitemcheckbox')).toHaveLength(3);

    // Click away → closes.
    await user.click(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<PerformanceChart series={series} months={months} mobileLegend="dropdown" />);
    narrow();
    const trigger = screen.getByRole('button', { name: /Showing/ });
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('toggles a series from a menu item, updating the summary, menu kept open', async () => {
    const user = userEvent.setup();
    render(<PerformanceChart series={series} months={months} mobileLegend="dropdown" />);
    narrow();
    await user.click(screen.getByRole('button', { name: /Showing/ }));
    const canceled = screen.getByRole('menuitemcheckbox', { name: /Canceled/ });
    expect(canceled).toHaveAttribute('aria-checked', 'true');
    await user.click(canceled);
    expect(canceled).toHaveAttribute('aria-checked', 'false');
    // Still open, and the trigger now names only the shown series.
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Showing/ })).toHaveTextContent('Completed, Missed');
  });

  it('moves focus between menu items with the arrow keys', async () => {
    const user = userEvent.setup();
    render(<PerformanceChart series={series} months={months} mobileLegend="dropdown" />);
    narrow();
    await user.click(screen.getByRole('button', { name: /Showing/ }));
    const items = screen.getAllByRole('menuitemcheckbox');
    expect(items[0]).toHaveFocus(); // focus lands on the first item on open
    await user.keyboard('{ArrowDown}');
    expect(items[1]).toHaveFocus();
    await user.keyboard('{End}');
    expect(items[2]).toHaveFocus();
    await user.keyboard('{Home}');
    expect(items[0]).toHaveFocus();
  });

  it('shows the empty copy, not a blank chart, when the series is all zero', () => {
    render(<PerformanceChart series={zero} months={months} mobileLegend="dropdown" />);
    narrow();
    expect(screen.getByText('No sessions yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Showing/ })).not.toBeInTheDocument();
  });
});

describe('PerformanceChart chart-type switch', () => {
  // A line chart draws <polyline>s; bars draw none — the reliable discriminator
  // (plain <rect>s exist in both for the grid and hit areas).
  const isLine = (c: HTMLElement) => c.querySelector('polyline') !== null;

  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('shows a Chart type switch, defaulting to bars for a short range', () => {
    const { container } = render(<PerformanceChart series={series} months={months} />);
    expect(screen.getByRole('radiogroup', { name: 'Chart type' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Bar chart' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Line chart' })).toHaveAttribute('aria-checked', 'false');
    expect(isLine(container)).toBe(false);
  });

  it('defaults to a line for a 12-month (trend) range', () => {
    const { container } = render(
      <PerformanceChart series={series} months={months} defaultRange="12m" />,
    );
    expect(screen.getByRole('radio', { name: 'Line chart' })).toHaveAttribute('aria-checked', 'true');
    expect(isLine(container)).toBe(true);
  });

  it('switches to a line on click and remembers the choice', async () => {
    const user = userEvent.setup();
    const { container } = render(<PerformanceChart series={series} months={months} />);
    expect(isLine(container)).toBe(false);
    await user.click(screen.getByRole('radio', { name: 'Line chart' }));
    expect(screen.getByRole('radio', { name: 'Line chart' })).toHaveAttribute('aria-checked', 'true');
    expect(isLine(container)).toBe(true);
    expect(localStorage.getItem('ef-chart-type')).toBe('line');
  });

  it('honours a remembered chart type on mount, over the range default', () => {
    localStorage.setItem('ef-chart-type', 'line');
    const { container } = render(<PerformanceChart series={series} months={months} />);
    // 6M would default to bars; the remembered line wins.
    expect(screen.getByRole('radio', { name: 'Line chart' })).toHaveAttribute('aria-checked', 'true');
    expect(isLine(container)).toBe(true);
  });

  it('hides the switch and uses the variant prop when chartSwitch is "hide"', () => {
    const { container } = render(
      <PerformanceChart series={series} months={months} chartSwitch="hide" variant="line" />,
    );
    expect(screen.queryByRole('radiogroup', { name: 'Chart type' })).not.toBeInTheDocument();
    expect(isLine(container)).toBe(true);
  });

  it('moves between bar and line with the arrow keys', async () => {
    const user = userEvent.setup();
    render(<PerformanceChart series={series} months={months} />);
    screen.getByRole('radio', { name: 'Bar chart' }).focus();
    await user.keyboard('{ArrowRight}');
    const line = screen.getByRole('radio', { name: 'Line chart' });
    expect(line).toHaveAttribute('aria-checked', 'true');
    expect(line).toHaveFocus(); // roving tabindex follows the selection
    await user.keyboard('{ArrowRight}'); // wraps back to bar
    expect(screen.getByRole('radio', { name: 'Bar chart' })).toHaveAttribute('aria-checked', 'true');
  });

  it('keeps two charts in sync through the shared preference store', async () => {
    const user = userEvent.setup();
    render(
      <>
        <PerformanceChart series={series} months={months} />
        <PerformanceChart series={series} months={months} />
      </>,
    );
    const lines = screen.getAllByRole('radio', { name: 'Line chart' });
    expect(lines).toHaveLength(2);
    await user.click(lines[0]!);
    // The pick flows through the store, so the second chart follows too.
    for (const r of screen.getAllByRole('radio', { name: 'Line chart' })) {
      expect(r).toHaveAttribute('aria-checked', 'true');
    }
  });
});
