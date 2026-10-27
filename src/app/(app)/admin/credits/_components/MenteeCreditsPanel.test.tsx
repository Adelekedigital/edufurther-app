import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MenteeHeader, PanelBody, type PanelBodyProps } from './MenteeCreditsPanel';
import { AMARA, CHIAMAKA, ENTRIES, NO_MORE } from './fixtures';

const base: PanelBodyProps = {
  mentee: AMARA,
  history: ENTRIES,
  status: 'ready',
  onRetry: vi.fn(),
  timeZone: 'Africa/Lagos',
  amount: 1,
  onAmount: vi.fn(),
  reason: '',
  onReason: vi.fn(),
  onAdd: vi.fn(),
  more: NO_MORE,
};

/** The panel with its own amount state, as the screen holds it. */
function Live(p: Partial<PanelBodyProps>) {
  const [amount, setAmount] = useState(1);
  return <PanelBody {...base} {...p} amount={amount} onAmount={setAmount} />;
}

describe('MenteeHeader', () => {
  it('names the mentee, with email and the short id', () => {
    render(<MenteeHeader name={AMARA.name} mentee={AMARA} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Amara Okafor' })).toBeInTheDocument();
    expect(screen.getByText('amara.okafor@example.com · a3f2c1d4')).toBeInTheDocument();
  });
});

describe('PanelBody', () => {
  it('shows the balance, stage and reset', () => {
    render(<PanelBody {...base} />);
    expect(screen.getByText('Left this month')).toBeInTheDocument();
    expect(screen.getByText('of 3')).toBeInTheDocument();
    expect(screen.getByText('Monthly credits')).toBeInTheDocument();
    expect(screen.getByText('Resets Nov 1')).toBeInTheDocument();
  });

  it('a starter mentee reads "Starter credit"', () => {
    render(<PanelBody {...base} mentee={CHIAMAKA} />);
    expect(screen.getByText('Starter credit')).toBeInTheDocument();
  });

  it('the stepper runs from 1 to 3 and the button follows it', async () => {
    render(<Live />);
    const fewer = screen.getByRole('button', { name: 'One fewer' });
    const more = screen.getByRole('button', { name: 'One more' });
    const group = screen.getByRole('group', { name: 'Credits to add' });
    expect(fewer).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(fewer);
    expect(group).toHaveTextContent('1');
    await userEvent.click(more);
    await userEvent.click(more);
    await userEvent.click(more);
    expect(group).toHaveTextContent('3');
    expect(more).toHaveAttribute('aria-disabled', 'true');
    expect(more).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Add 3 credits' })).toBeInTheDocument();
    await userEvent.click(fewer);
    expect(screen.getByRole('button', { name: 'Add 2 credits' })).toBeInTheDocument();
  });

  it('Add opens the confirm', async () => {
    const onAdd = vi.fn();
    render(<PanelBody {...base} onAdd={onAdd} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add 1 credit' }));
    expect(onAdd).toHaveBeenCalled();
  });

  it('the reason is the shared Select, optional', async () => {
    const onReason = vi.fn();
    render(<PanelBody {...base} onReason={onReason} />);
    const reason = screen.getByRole('combobox', { name: 'Reason (optional)' });
    expect(reason).toHaveTextContent('Choose a reason');
    await userEvent.click(reason);
    await userEvent.click(screen.getByRole('option', { name: 'Goodwill' }));
    expect(onReason).toHaveBeenCalledWith('Goodwill');
  });

  it('history: newest first, the change signed, what, when, by and what was left', () => {
    render(<PanelBody {...base} />);
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('-1');
    expect(rows[0]).toHaveTextContent('Booked a session with Ibrahim Adele');
    expect(rows[0]).toHaveTextContent('Oct 24 · Amara');
    expect(rows[0]).toHaveTextContent('1 left');
    expect(rows[1]).toHaveTextContent('+1');
  });

  it('empty history: "No credit changes yet"; Show older only with a cursor', async () => {
    const loadMore = vi.fn();
    const { rerender } = render(<PanelBody {...base} history={[]} />);
    expect(screen.getByText('No credit changes yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show older changes' })).toBeNull();
    rerender(<PanelBody {...base} more={{ ...NO_MORE, hasMore: true, loadMore }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Show older changes' }));
    expect(loadMore).toHaveBeenCalled();
  });

  it('loading and error states', async () => {
    const onRetry = vi.fn();
    const { rerender } = render(<PanelBody {...base} mentee={null} status="loading" />);
    expect(screen.getByRole('status', { name: 'Loading credits' })).toBeInTheDocument();
    rerender(<PanelBody {...base} mentee={null} status="error" onRetry={onRetry} />);
    expect(screen.getByRole('heading', { name: 'We couldn’t load credits' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });
});
