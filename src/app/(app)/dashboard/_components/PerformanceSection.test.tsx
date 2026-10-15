import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppError } from '@/types/mentor';
import { PerformanceSection } from './PerformanceSection';
import * as stats from '@/lib/api/data/mentorStats';

vi.mock('@/lib/api/data/mentorStats');

const EMPTY = { months: [], completed: [], canceled: [], missed: [] };
const mockHook = (over: Partial<ReturnType<typeof stats.useMentorMonthlyStats>>) =>
  vi
    .mocked(stats.useMentorMonthlyStats)
    .mockReturnValue({ data: EMPTY, isLoading: false, error: null, retry: vi.fn(), ...over });

describe('PerformanceSection', () => {
  afterEach(() => vi.clearAllMocks());

  it('shows a loading status, not the empty state, while the stats load', () => {
    mockHook({ isLoading: true });
    render(<PerformanceSection userId="m1" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('No sessions yet')).not.toBeInTheDocument();
  });

  it('shows the error with a retry — before any empty state — when the load fails', async () => {
    const retry = vi.fn();
    // Error AND empty data: the error must win, never read as "No sessions yet".
    mockHook({ error: { kind: 'server', message: 'Boom' } as AppError, retry, data: EMPTY });
    render(<PerformanceSection userId="m1" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('No sessions yet')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('hands loaded data to the chart (whose own empty state shows for no sessions)', () => {
    mockHook({ data: EMPTY });
    render(<PerformanceSection userId="m1" />);
    expect(screen.getByText('No sessions yet')).toBeInTheDocument();
  });

  it('fetches the full platform history (months=60) so the ranges and year select cover it', () => {
    const hook = mockHook({ data: EMPTY });
    render(<PerformanceSection userId="m1" />);
    expect(hook).toHaveBeenCalledWith('m1', 60);
  });
});
