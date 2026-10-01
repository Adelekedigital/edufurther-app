import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BlockedDatesPanel } from './BlockedDatesPanel';

describe('BlockedDatesPanel', () => {
  it('with nothing blocked, invites blocking dates', async () => {
    const onEdit = vi.fn();
    render(<BlockedDatesPanel days={[]} onEdit={onEdit} onUnblock={vi.fn()} />);
    expect(screen.getByText('Away on some days?')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Block dates' }));
    expect(onEdit).toHaveBeenCalled();
  });

  it('lists the days as chips with an Unblock button each', async () => {
    const onUnblock = vi.fn();
    render(
      <BlockedDatesPanel
        days={['2026-10-12', '2026-10-13']}
        onEdit={vi.fn()}
        onUnblock={onUnblock}
      />,
    );
    expect(screen.getByText('2 blocked dates')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Unblock Tue, Oct 13' }));
    expect(onUnblock).toHaveBeenCalledWith('2026-10-13');
  });

  it('when a chip goes, focus moves to the next one, else to Edit', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <BlockedDatesPanel
        days={['2026-10-12', '2026-10-13']}
        onEdit={vi.fn()}
        onUnblock={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Unblock Mon, Oct 12' }));
    rerender(<BlockedDatesPanel days={['2026-10-13']} onEdit={vi.fn()} onUnblock={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Unblock Tue, Oct 13' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Unblock Tue, Oct 13' }));
    rerender(<BlockedDatesPanel days={[]} onEdit={vi.fn()} onUnblock={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Block dates' })).toHaveFocus();
  });

  it('a day being unblocked waits', async () => {
    const onUnblock = vi.fn();
    render(
      <BlockedDatesPanel
        days={['2026-10-12']}
        onEdit={vi.fn()}
        onUnblock={onUnblock}
        busyDay="2026-10-12"
      />,
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Unblock Mon, Oct 12' }));
    expect(onUnblock).not.toHaveBeenCalled();
  });
});
