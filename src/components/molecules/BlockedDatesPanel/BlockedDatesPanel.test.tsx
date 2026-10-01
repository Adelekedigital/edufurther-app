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

  it('while a save is on its way, every × and Edit wait', async () => {
    const onUnblock = vi.fn();
    render(<BlockedDatesPanel days={['2026-10-12']} onEdit={vi.fn()} onUnblock={onUnblock} busy />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Unblock Mon, Oct 12' }));
    expect(onUnblock).not.toHaveBeenCalled();
  });

  it('shows why an unblock failed, under the chips', () => {
    render(
      <BlockedDatesPanel
        days={['2026-10-12']}
        onEdit={vi.fn()}
        onUnblock={vi.fn()}
        error="We couldn’t save your blocked dates. Try again."
      />,
    );
    expect(screen.getByText('We couldn’t save your blocked dates. Try again.')).toBeInTheDocument();
  });

  it('after a failed unblock, a later change doesn’t pull focus to a chip', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <BlockedDatesPanel
        days={['2026-10-12', '2026-10-13']}
        onEdit={vi.fn()}
        onUnblock={vi.fn()}
        busy
      />,
    );
    // busy: the click is ignored; then a click that fails (the day stays).
    rerender(
      <BlockedDatesPanel
        days={['2026-10-12', '2026-10-13']}
        onEdit={vi.fn()}
        onUnblock={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Unblock Mon, Oct 12' }));
    rerender(
      <BlockedDatesPanel
        days={['2026-10-12', '2026-10-13']}
        onEdit={vi.fn()}
        onUnblock={vi.fn()}
        busy
      />,
    );
    rerender(
      <BlockedDatesPanel
        days={['2026-10-12', '2026-10-13']}
        onEdit={vi.fn()}
        onUnblock={vi.fn()}
      />,
    );
    document.body.focus();
    (document.activeElement as HTMLElement | null)?.blur();
    // Later, Oct 12 goes another way (the modal): focus stays where it is.
    rerender(<BlockedDatesPanel days={['2026-10-13']} onEdit={vi.fn()} onUnblock={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Unblock Tue, Oct 13' })).not.toHaveFocus();
  });
});
