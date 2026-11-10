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
    const prev = screen.getByRole('button', { name: 'Previous month' });
    expect(prev).toHaveAttribute('aria-disabled', 'true');
    await user.click(prev);
    expect(screen.getByRole('table', { name: 'December 2026' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByRole('table', { name: 'January 2027' })).toBeInTheDocument();
    await user.click(prev);
    expect(screen.getByRole('table', { name: 'December 2026' })).toBeInTheDocument();
  });

  it('keeps focus on Previous when it reaches the first month', async () => {
    const user = userEvent.setup();
    render(<MonthPicker readOnly today="2026-12-20" />);
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    const prev = screen.getByRole('button', { name: 'Previous month' });
    prev.focus();
    await user.keyboard('{Enter}');
    expect(prev).toHaveAttribute('aria-disabled', 'true');
    expect(prev).toHaveFocus();
  });
});

describe('MonthPicker, pickable', () => {
  it('is one tab stop; arrows move by day and week, into the next month', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<MonthPicker today="2026-10-29" onPick={onPick} />);
    // Previous month (off this month, but focusable: aria-disabled), Next month, then the days.
    await user.tab();
    expect(screen.getByRole('button', { name: 'Previous month' })).toHaveFocus();
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

describe('MonthPicker, a day picker over open times (SuggestTime.dc.html dayPicker)', () => {
  it('marks exact open days, opens on a later month, and never calls a pick "blocked"', () => {
    render(
      <MonthPicker
        today="2026-10-20"
        initialMonth="2026-11-14"
        openDays={['2026-11-03', '2026-11-05']}
        selected={['2026-11-05']}
        selectedLabel={null}
        onPick={() => {}}
      />,
    );
    expect(screen.getByRole('grid', { name: 'November 2026' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tuesday, November 3, available' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Wednesday, November 4' })).toBeVisible();
    // The pick: pressed, and no "blocked" in its name.
    expect(screen.getByRole('button', { name: 'Thursday, November 5' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('a month before today’s opens on today’s', () => {
    render(<MonthPicker today="2026-10-20" initialMonth="2026-08-01" onPick={() => {}} />);
    expect(screen.getByRole('grid', { name: 'October 2026' })).toBeInTheDocument();
  });
});

describe('MonthPicker, a reporting range (min in the past, max today)', () => {
  const range = (initialMonth?: string) => (
    <MonthPicker
      today="2026-11-09"
      min="2024-06-01"
      max="2026-11-09"
      initialMonth={initialMonth}
      selectedLabel={null}
      onPick={() => {}}
    />
  );

  it('opens on today’s month, pages back, and stops at max’s month', async () => {
    const user = userEvent.setup();
    render(range());
    expect(screen.getByRole('grid', { name: 'November 2026' })).toBeInTheDocument();
    const next = screen.getByRole('button', { name: 'Next month' });
    expect(next).toHaveAttribute('aria-disabled', 'true');
    await user.click(next);
    expect(screen.getByRole('grid', { name: 'November 2026' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByRole('grid', { name: 'October 2026' })).toBeInTheDocument();
    expect(next).not.toHaveAttribute('aria-disabled');
  });

  it('keeps focus on Next when it reaches max’s month', async () => {
    const user = userEvent.setup();
    render(range('2026-10-01'));
    const next = screen.getByRole('button', { name: 'Next month' });
    next.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('grid', { name: 'November 2026' })).toBeInTheDocument();
    expect(next).toHaveAttribute('aria-disabled', 'true');
    expect(next).toHaveFocus();
  });

  it('max before today’s month, no min: opens on max’s month and stays there', () => {
    render(<MonthPicker today="2026-11-09" max="2026-09-30" onPick={() => {}} />);
    expect(screen.getByRole('grid', { name: 'September 2026' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next month' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('days after max can be reached but not picked', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<MonthPicker today="2026-11-09" min="2024-06-01" max="2026-11-09" onPick={onPick} />);
    const later = screen.getByRole('button', { name: 'Tuesday, November 10' });
    expect(later).toHaveAttribute('aria-disabled', 'true');
    await user.click(later);
    expect(onPick).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Monday, November 9' })).not.toHaveAttribute(
      'aria-disabled',
    );
  });

  it('opens on an earlier month, and stops at min’s month', () => {
    render(range('2024-06-15'));
    expect(screen.getByRole('grid', { name: 'June 2024' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous month' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('a month outside min..max opens on the nearest end', () => {
    const { unmount } = render(range('2023-01-01'));
    expect(screen.getByRole('grid', { name: 'June 2024' })).toBeInTheDocument();
    unmount();
    render(range('2027-03-01'));
    expect(screen.getByRole('grid', { name: 'November 2026' })).toBeInTheDocument();
  });

  it('the arrow keys stop at max', async () => {
    const user = userEvent.setup();
    render(range());
    screen.getByRole('button', { name: 'Monday, November 9' }).focus();
    await user.keyboard('{PageDown}');
    expect(screen.getByRole('grid', { name: 'November 2026' })).toBeInTheDocument();
    await user.keyboard('{PageUp}');
    expect(screen.getByRole('grid', { name: 'October 2026' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Friday, October 9' })).toHaveFocus();
  });
});
