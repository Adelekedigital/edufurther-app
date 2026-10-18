import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Confetti, CONFETTI_MS } from './Confetti';

const original = window.matchMedia;
afterEach(() => {
  window.matchMedia = original;
  vi.useRealTimers();
});

describe('Confetti', () => {
  it('bursts once, hidden from assistive tech, then clears', () => {
    vi.useFakeTimers();
    render(<Confetti />);
    expect(screen.getByTestId('confetti')).toHaveAttribute('aria-hidden', 'true');
    act(() => void vi.advanceTimersByTime(CONFETTI_MS));
    expect(screen.queryByTestId('confetti')).toBeNull();
  });

  it('never renders under reduced motion', () => {
    window.matchMedia = ((q: string) => ({
      ...original(q),
      matches: q.includes('prefers-reduced-motion'),
    })) as typeof window.matchMedia;
    render(<Confetti />);
    expect(screen.queryByTestId('confetti')).toBeNull();
  });
});
