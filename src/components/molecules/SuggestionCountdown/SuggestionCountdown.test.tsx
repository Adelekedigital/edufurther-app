import { act, render, screen } from '@testing-library/react';
import { SuggestionCountdown, holdLeftLabel, isHoldLapsed } from './SuggestionCountdown';

const NOW = new Date('2026-10-05T12:00:00Z');
const MIN = 60_000;
/** A `held_until` this far from NOW. */
const held = (ms: number) => new Date(NOW.getTime() + ms).toISOString();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe('what the pill reads', () => {
  it('a fresh two-hour hold', () => {
    render(<SuggestionCountdown heldUntil={held(120 * MIN)} now={NOW} />);
    expect(screen.getByText('2h left')).toBeInTheDocument();
  });

  it('hours and minutes together, so "1h left" is never true for an hour', () => {
    render(<SuggestionCountdown heldUntil={held(118 * MIN)} now={NOW} />);
    expect(screen.getByText('1h 58m left')).toBeInTheDocument();
  });

  it('minutes alone under the hour', () => {
    render(<SuggestionCountdown heldUntil={held(58 * MIN)} now={NOW} />);
    expect(screen.getByText('58m left')).toBeInTheDocument();
  });

  it('single minutes, floored — never more time than there is', () => {
    render(<SuggestionCountdown heldUntil={held(4 * MIN + 59_000)} now={NOW} />);
    expect(screen.getByText('4m left')).toBeInTheDocument();
  });

  it('words rather than "0m" in the last minute', () => {
    render(<SuggestionCountdown heldUntil={held(30_000)} now={NOW} />);
    expect(screen.getByText('Less than a minute left')).toBeInTheDocument();
  });

  it('exactly on the deadline the hold is over, not "0m left"', () => {
    render(<SuggestionCountdown heldUntil={held(0)} now={NOW} />);
    expect(screen.getByText('Hold lapsed')).toBeInTheDocument();
  });

  it('past the deadline it never goes negative or stays stuck', () => {
    render(<SuggestionCountdown heldUntil={held(-90 * MIN)} now={NOW} />);
    expect(screen.getByText('Hold lapsed')).toBeInTheDocument();
    expect(screen.queryByText(/-/)).not.toBeInTheDocument();
  });

  it('an unparseable instant reads as lapsed rather than crashing the row', () => {
    render(<SuggestionCountdown heldUntil="not a date" now={NOW} />);
    expect(screen.getByText('Hold lapsed')).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('what a screen reader hears', () => {
  it('the band, not the minute: it changes three times in two hours, not 120', () => {
    const { rerender } = render(<SuggestionCountdown heldUntil={held(118 * MIN)} now={NOW} />);
    const says = () => screen.getByRole('status').textContent;
    expect(says()).toBe('More than an hour left to book this time.');
    rerender(<SuggestionCountdown heldUntil={held(58 * MIN)} now={NOW} />);
    expect(says()).toBe('Less than an hour left to book this time.');
    // Still the same sentence a minute later: nothing is announced on a tick.
    rerender(<SuggestionCountdown heldUntil={held(57 * MIN)} now={NOW} />);
    expect(says()).toBe('Less than an hour left to book this time.');
    rerender(<SuggestionCountdown heldUntil={held(4 * MIN)} now={NOW} />);
    expect(says()).toBe('Less than 10 minutes left to book this time.');
    rerender(<SuggestionCountdown heldUntil={held(0)} now={NOW} />);
    expect(says()).toBe('The hold on this time has lapsed.');
  });

  it('the live region is in the page from the start, so a change is heard', () => {
    render(<SuggestionCountdown heldUntil={held(120 * MIN)} now={NOW} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('warns in words as well as colour under ten minutes', () => {
    render(<SuggestionCountdown heldUntil={held(9 * MIN)} now={NOW} />);
    expect(screen.getByRole('status').textContent).toMatch(/Less than 10 minutes/);
  });
});

describe('the clock', () => {
  it('counts down on its own and stops once the hold is over', () => {
    render(<SuggestionCountdown heldUntil={held(2 * MIN + 30_000)} />);
    expect(screen.getByText('2m left')).toBeInTheDocument();
    // One wake per reading: the timer lands just past each whole minute left.
    act(() => {
      vi.advanceTimersToNextTimer();
    });
    expect(screen.getByText('1m left')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersToNextTimer();
    });
    expect(screen.getByText('Less than a minute left')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersToNextTimer();
    });
    expect(screen.getByText('Hold lapsed')).toBeInTheDocument();
    // Nothing is still waiting to redraw a dead number.
    expect(vi.getTimerCount()).toBe(0);
  });

  it('schedules nothing at all for a hold that is already over', () => {
    render(<SuggestionCountdown heldUntil={held(-1)} />);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('schedules nothing when the caller owns the clock', () => {
    render(<SuggestionCountdown heldUntil={held(90 * MIN)} now={NOW} />);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('leaves no timer behind on unmount', () => {
    const { unmount } = render(<SuggestionCountdown heldUntil={held(90 * MIN)} />);
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('wakes on the next whole minute of what is left, not 60s from mount', () => {
    render(<SuggestionCountdown heldUntil={held(90 * MIN + 10_000)} />);
    expect(screen.getByText('1h 30m left')).toBeInTheDocument();
    // Ten seconds in, not a minute: the first wake is the 90-minute boundary.
    act(() => {
      vi.advanceTimersByTime(10_001);
    });
    expect(screen.getByText('1h 29m left')).toBeInTheDocument();
  });
});

describe('isHoldLapsed', () => {
  it('is true on the deadline and after it, false before', () => {
    expect(isHoldLapsed(held(1), NOW)).toBe(false);
    expect(isHoldLapsed(held(0), NOW)).toBe(true);
    expect(isHoldLapsed(held(-1), NOW)).toBe(true);
    expect(isHoldLapsed('nonsense', NOW)).toBe(true);
  });
});

describe('holdLeftLabel at the band edges', () => {
  it('switches to hours exactly on the hour, not a minute either side', () => {
    expect(holdLeftLabel(59 * MIN + 59_000)).toBe('59m');
    expect(holdLeftLabel(60 * MIN)).toBe('1h');
    expect(holdLeftLabel(60 * MIN + 1)).toBe('1h');
    expect(holdLeftLabel(61 * MIN)).toBe('1h 1m');
  });

  it('drops a bare "0m" from a whole-hour reading', () => {
    expect(holdLeftLabel(120 * MIN)).toBe('2h');
  });

  it('never reads "0m"', () => {
    expect(holdLeftLabel(59_999)).toBe('Less than a minute');
    expect(holdLeftLabel(0)).toBe('Less than a minute');
  });
});
