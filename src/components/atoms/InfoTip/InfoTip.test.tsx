import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InfoTip } from './InfoTip';

describe('InfoTip', () => {
  it('names the trigger with the hint and keeps the bubble closed until asked', () => {
    render(<InfoTip label="Average of mentee reviews" />);
    expect(screen.getByRole('button', { name: 'Average of mentee reviews' })).toBeInTheDocument();
    // The visible bubble (the span) is not rendered until revealed.
    expect(screen.queryByText('Average of mentee reviews')).not.toBeInTheDocument();
  });

  it('reveals on hover and hides again on unhover', async () => {
    const user = userEvent.setup();
    render(<InfoTip label="Hint text" />);
    const trigger = screen.getByRole('button', { name: 'Hint text' });
    await user.hover(trigger);
    expect(screen.getByText('Hint text')).toBeVisible();
    await user.unhover(trigger);
    expect(screen.queryByText('Hint text')).not.toBeInTheDocument();
  });

  it('reveals on keyboard focus and hides on blur', async () => {
    const user = userEvent.setup();
    render(
      <>
        <InfoTip label="Hint text" />
        <button type="button">Next</button>
      </>,
    );
    await user.tab();
    expect(screen.getByText('Hint text')).toBeVisible();
    await user.tab();
    expect(screen.queryByText('Hint text')).not.toBeInTheDocument();
  });

  it('closes on Escape but keeps focus on the trigger', async () => {
    const user = userEvent.setup();
    render(<InfoTip label="Hint text" />);
    const trigger = screen.getByRole('button', { name: 'Hint text' });
    await user.tab();
    expect(trigger).toHaveFocus();
    expect(screen.getByText('Hint text')).toBeVisible();
    await user.keyboard('{Escape}');
    expect(screen.queryByText('Hint text')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('swallows the Escape that closes it, then lets a later Escape through to a parent', async () => {
    const user = userEvent.setup();
    const onParentKeyDown = vi.fn();
    render(
      <div onKeyDown={onParentKeyDown}>
        <InfoTip label="Hint text" />
      </div>,
    );
    await user.tab(); // focus → open
    await user.keyboard('{Escape}'); // closes the tip; must not reach the parent
    expect(screen.queryByText('Hint text')).not.toBeInTheDocument();
    expect(onParentKeyDown).not.toHaveBeenCalled();
    await user.keyboard('{Escape}'); // tip already closed → falls through (e.g. to a modal)
    expect(onParentKeyDown).toHaveBeenCalledTimes(1);
  });
});
