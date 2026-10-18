import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

let search = '';
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search),
  usePathname: () => '/dashboard',
  useRouter: () => ({ replace }),
}));

const { ApprovedToast, APPROVED_TOAST_MS } = await import('./ApprovedToast');

afterEach(() => {
  vi.useRealTimers();
  replace.mockReset();
});

describe('ApprovedToast (Mentor Dashboard v2.dc.html ?toast=approved)', () => {
  it('says so in a live region, drops the parameter, and goes after 4s', () => {
    vi.useFakeTimers();
    search = 'toast=approved&tab=week';
    render(<ApprovedToast />);
    expect(screen.getByRole('status')).toHaveTextContent('You’re already approved');
    expect(replace).toHaveBeenCalledWith('/dashboard?tab=week', { scroll: false });
    act(() => void vi.advanceTimersByTime(APPROVED_TOAST_MS));
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('is an empty region otherwise', () => {
    search = '';
    render(<ApprovedToast />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(replace).not.toHaveBeenCalled();
  });
});
