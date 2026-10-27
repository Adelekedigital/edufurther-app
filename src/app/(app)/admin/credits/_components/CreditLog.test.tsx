import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreditLog } from './CreditLog';
import { CreditRules } from './CreditRules';
import { ENTRIES, NO_MORE } from './fixtures';

const props = {
  type: 'all' as const,
  onType: vi.fn(),
  entries: ENTRIES,
  status: 'ready' as const,
  onRetry: vi.fn(),
  timeZone: 'Africa/Lagos',
  onOpen: vi.fn(),
  more: NO_MORE,
};

beforeEach(() => {
  props.onType.mockClear();
  props.onOpen.mockClear();
});

describe('CreditLog', () => {
  it('chips filter by type, All first and pressed', async () => {
    render(<CreditLog {...props} />);
    const chips = within(screen.getByRole('group', { name: 'Show changes' })).getAllByRole(
      'button',
    );
    expect(chips.map((c) => c.textContent)).toEqual([
      'All',
      'Added by admin',
      'Bookings',
      'Refunds',
      'Monthly and starter',
    ]);
    expect(chips[0]).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(chips[3]!);
    expect(props.onType).toHaveBeenCalledWith('refunds');
  });

  it('a table: When, Mentee, Change, What happened, By', () => {
    render(<CreditLog {...props} />);
    const table = screen.getByRole('table', { name: 'Credit log' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((c) => c.textContent),
    ).toEqual(['When', 'Mentee', 'Change', 'What happened', 'By']);
    const first = within(table).getAllByRole('row')[1]!;
    expect(
      within(first)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['Oct 24', 'Amara Okafor', '-1', 'Booked a session with Ibrahim Adele', 'Amara']);
  });

  it('a mentee opens their panel; a deleted account has nothing to open', async () => {
    render(<CreditLog {...props} />);
    await userEvent.click(screen.getAllByRole('button', { name: 'Amara Okafor' })[0]!);
    expect(props.onOpen).toHaveBeenCalledWith(ENTRIES[0]);
    expect(screen.queryByRole('button', { name: 'Deleted account' })).toBeNull();
    expect(screen.getByText('Deleted account')).toBeInTheDocument();
  });

  it('loading, error before empty, empty', () => {
    const { rerender } = render(<CreditLog {...props} status="loading" entries={[]} />);
    expect(screen.getByRole('status', { name: 'Loading credit changes' })).toBeInTheDocument();
    rerender(<CreditLog {...props} status="error" entries={[]} />);
    expect(screen.getByRole('heading', { name: 'We couldn’t load credits' })).toBeInTheDocument();
    rerender(<CreditLog {...props} entries={[]} />);
    expect(screen.getByRole('heading', { name: 'No credit changes yet' })).toBeInTheDocument();
  });

  it('offers older changes only with a cursor', () => {
    const { rerender } = render(<CreditLog {...props} />);
    expect(screen.queryByRole('button', { name: 'Show older changes' })).toBeNull();
    rerender(<CreditLog {...props} more={{ ...NO_MORE, hasMore: true }} />);
    expect(screen.getByRole('button', { name: 'Show older changes' })).toBeInTheDocument();
  });
});

describe('CreditRules', () => {
  it('shows the server values, read-only, and the unlock rule', () => {
    render(<CreditRules rules={{ starter: 1, monthly: 3 }} status="ready" onRetry={vi.fn()} />);
    expect(screen.getByText('Starter credits').closest('div')).toHaveTextContent('1');
    expect(
      screen.getByText('What every new mentee gets once, when they finish their profile.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Monthly credits').closest('div')).toHaveTextContent('3');
    expect(screen.getByText('How monthly credits unlock')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('loading and error', async () => {
    const onRetry = vi.fn();
    const { rerender } = render(<CreditRules rules={null} status="loading" onRetry={onRetry} />);
    expect(screen.getByRole('status', { name: 'Loading credit rules' })).toBeInTheDocument();
    rerender(<CreditRules rules={null} status="error" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });
});
