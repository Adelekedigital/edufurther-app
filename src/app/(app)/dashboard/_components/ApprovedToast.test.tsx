import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

let search = '';
const { replaceQuery } = vi.hoisted(() => ({ replaceQuery: vi.fn() }));
vi.mock('@/lib/utils/replaceQuery', () => ({ replaceQuery }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search),
  usePathname: () => '/dashboard',
}));

const { ApprovedToast, APPROVED_TOAST_MS } = await import('./ApprovedToast');

afterEach(() => {
  vi.useRealTimers();
  replaceQuery.mockReset();
});

describe('ApprovedToast (Mentor Dashboard v2.dc.html ?toast=approved)', () => {
  it('says so in a live region, drops the parameter, and goes after 4s', () => {
    vi.useFakeTimers();
    search = 'toast=approved&tab=week';
    render(<ApprovedToast />);
    expect(screen.getByRole('status')).toHaveTextContent('You’re already approved');
    expect(replaceQuery).toHaveBeenCalledWith('/dashboard?tab=week');
    act(() => void vi.advanceTimersByTime(APPROVED_TOAST_MS));
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('is an empty region otherwise', () => {
    search = '';
    render(<ApprovedToast />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(replaceQuery).not.toHaveBeenCalled();
  });
});
