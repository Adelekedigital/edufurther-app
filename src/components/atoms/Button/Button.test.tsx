import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button: unavailable', () => {
  it('stays focusable, says it is off, gives its title as the reason, and ignores clicks', async () => {
    const onClick = vi.fn();
    render(
      <Button unavailable title="You can offer up to 5 sessions." onClick={onClick}>
        Create session
      </Button>,
    );
    const b = screen.getByRole('button', { name: 'Create session' });
    expect(b).not.toBeDisabled();
    expect(b).toHaveAttribute('aria-disabled', 'true');
    expect(b).toHaveAccessibleDescription('You can offer up to 5 sessions.');
    b.focus();
    expect(b).toHaveFocus();
    await userEvent.click(b);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('without it, a button keeps its own aria-disabled and its click', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    const b = screen.getByRole('button', { name: 'Save' });
    expect(b).not.toHaveAttribute('aria-disabled');
    expect(b).not.toHaveAttribute('data-unavailable');
    await userEvent.click(b);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
