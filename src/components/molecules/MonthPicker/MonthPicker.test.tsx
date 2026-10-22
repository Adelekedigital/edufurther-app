import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MonthPicker } from './MonthPicker';

describe('MonthPicker, read-only (Month at a glance)', () => {
  it('names the month and says what each day is', () => {
    render(
      <MonthPicker
        readOnly
        today="2026-10-01"
        selected={['2026-10-12']}
        booked={['2026-10-04']}
        available={[1]}
        showLegend
      />,
    );
    expect(screen.getByRole('table', { name: 'October 2026' })).toBeInTheDocument();
    expect(screen.getByText('Monday, October 12, blocked')).toBeInTheDocument();
    expect(screen.getByText('Sunday, October 4, session booked')).toBeInTheDocument();
    expect(screen.getByText('Monday, October 5, available')).toBeInTheDocument();
    // Nothing to pick: no day is a button.
    expect(screen.queryByRole('button', { name: /October 12/ })).toBeNull();
  });

  it('the legend reads Available, Booked, Blocked, in the design’s order', () => {
    const { container } = render(
      <MonthPicker readOnly today="2026-10-01" available={[1]} showLegend />,
    );
    const keys = [...container.querySelectorAll('[class*="key"]')].map((k) => k.textContent);
    expect(keys).toEqual(['Available', 'Booked', 'Blocked']);
    expect(screen.queryByText('Open')).toBeNull();
  });

  it('read-only, blocked days and their swatch are grey; booked days are amber with a dot', () => {
    const { container } = render(
      <MonthPicker
        readOnly
        today="2026-10-01"
        selected={['2026-10-12', '2026-10-13', '2026-10-14']}
        booked={['2026-10-04']}
        showLegend
      />,
    );
    const day = (n: string) => screen.getByText(n, { selector: '[aria-hidden]' }).parentElement!;
    expect(day('12').className).toMatch(/selectedGrey/);
    expect(day('13').className).toMatch(/midGrey/);
    expect(day('12').parentElement!.className).toMatch(/bandGrey/);
    expect(day('12').className).not.toMatch(/(^|\s)\S*selected(?!Grey)/);
    expect(day('4').className).toMatch(/booked/);
    expect(day('4').querySelector('[class*="dot"]')).not.toBeNull();
    expect(container.querySelector('[class*="swatchBlockedGrey"]')).not.toBeNull();
  });

  it('pages forward and back, never before this month', async () => {
    const user = userEvent.setup();
    render(<MonthPicker readOnly today="2026-12-20" />);
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByRole('table', { name: 'January 2027' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByRole('table', { name: 'December 2026' })).toBeInTheDocument();
  });
});

describe('MonthPicker, pickable', () => {
  it('is one tab stop; arrows move by day and week, into the next month', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<MonthPicker today="2026-10-29" onPick={onPick} />);
    // Previous month is off this month, so: Next month, then the days.
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: /Thursday, October 29/ })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: /Friday, October 30/ })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('grid', { name: 'November 2026' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Friday, November 6/ })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onPick).toHaveBeenCalledWith('2026-11-06');
  });

  it('a past day can be reached but not picked', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<MonthPicker today="2026-10-15" onPick={onPick} />);
    const past = screen.getByRole('button', { name: /October 14/ });
    expect(past).toHaveAttribute('aria-disabled', 'true');
    await user.click(past);
    expect(onPick).not.toHaveBeenCalled();
  });

  it('a pick stays blue; blocking (selectedKind="blocked") draws grey', () => {
    const { rerender } = render(
      <MonthPicker today="2026-10-01" selected={['2026-10-12']} onPick={vi.fn()} showLegend />,
    );
    const btn = () => screen.getByRole('button', { name: /October 12/ });
    expect(btn().className).toMatch(/selected/);
    expect(btn().className).not.toMatch(/selectedGrey/);
    rerender(
      <MonthPicker
        today="2026-10-01"
        selected={['2026-10-12']}
        selectedKind="blocked"
        onPick={vi.fn()}
        showLegend
      />,
    );
    expect(btn().className).toMatch(/selectedGrey/);
  });

  it('a booked day on a blue pick keeps a white dot', () => {
    render(
      <MonthPicker
        today="2026-10-01"
        selected={['2026-10-12']}
        booked={['2026-10-12']}
        onPick={vi.fn()}
      />,
    );
    const dot = screen.getByRole('button', { name: /October 12/ }).querySelector('[class*="dot"]');
    expect(dot?.className).toMatch(/dotOnBlue/);
  });

  it('a booked day that is also blocked, in grey, keeps the gold dot (never white)', () => {
    render(
      <MonthPicker
        today="2026-10-01"
        selected={['2026-10-12']}
        booked={['2026-10-12']}
        selectedKind="blocked"
        onPick={vi.fn()}
      />,
    );
    const day = screen.getByRole('button', { name: /October 12/ });
    expect(day.className).toMatch(/selectedGrey/);
    const dot = day.querySelector('[class*="dot"]');
    expect(dot).not.toBeNull();
    expect(dot?.className).not.toMatch(/dotOnBlue/);
  });

  it('today keeps its ring when it is a grey pick', () => {
    render(
      <MonthPicker
        today="2026-10-12"
        selected={['2026-10-12']}
        selectedKind="blocked"
        onPick={vi.fn()}
      />,
    );
    const day = screen.getByRole('button', { name: /October 12/ });
    expect(day.className).toMatch(/selectedGrey/);
    expect(day.className).toMatch(/today/);
  });

  it('marks blocked days pressed', () => {
    render(<MonthPicker today="2026-10-01" selected={['2026-10-12']} onPick={vi.fn()} />);
    expect(screen.getByRole('button', { name: /October 12, blocked/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

describe('MonthPicker onMonthChange', () => {
  it('reports the month on mount and as it pages', async () => {
    const onMonthChange = vi.fn();
    const user = userEvent.setup();
    render(<MonthPicker readOnly today="2026-10-15" onMonthChange={onMonthChange} />);
    expect(onMonthChange).toHaveBeenLastCalledWith('2026-10-01');
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(onMonthChange).toHaveBeenLastCalledWith('2026-11-01');
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(onMonthChange).toHaveBeenLastCalledWith('2026-10-01');
  });
});

describe('MonthPicker past days (axe color-contrast on /calendar)', () => {
  const css = readFileSync(join(__dirname, 'MonthPicker.module.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );

  it('read in --text-tertiary (4.9:1 on white), never --ink-300 (1.5:1)', () => {
    const rule = css.match(/\.past[^{]*\{([^}]*)\}/);
    expect(rule?.[1]).toMatch(/color:\s*var\(--text-tertiary\)/);
    expect(css).not.toMatch(/\.past[^{]*\{[^}]*--ink-300/);
  });

  it('a past blocked or booked day keeps its own text colour', () => {
    expect(css.match(/\.past([^{]*)\{/)?.[1]).toMatch(
      /:not\(\.selected, \.mid, \.selectedGrey, \.midGrey, \.booked\)/,
    );
  });

  it('hovering a booked day keeps its amber: neither hover rule repaints .booked', () => {
    const hovers = [...css.matchAll(/([^{}]*button\.day:not\(([^)]*)\):hover)\s*\{/g)];
    expect(hovers.length).toBe(2);
    for (const [, , excluded] of hovers) expect(excluded).toMatch(/\.booked/);
  });

  it('booked days are drawn soft (amber fill), with no gold ring left', () => {
    expect(css).toMatch(/\.booked\s*\{[^}]*background:\s*var\(--calendar-booked-bg\)/);
    expect(css).not.toMatch(/calendar-booked-ring|box-shadow:\s*inset 0 0 0 2px/);
  });
});
