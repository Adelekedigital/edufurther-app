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

describe('Button: incomplete', () => {
  it('is drawn soft but stays pressable and enabled, so it can say what is missing', async () => {
    const onClick = vi.fn();
    render(
      <Button variant="primary" incomplete onClick={onClick}>
        Send reminder
      </Button>,
    );
    const b = screen.getByRole('button', { name: 'Send reminder' });
    expect(b).toHaveAttribute('data-incomplete');
    expect(b).toBeEnabled();
    expect(b).not.toHaveAttribute('aria-disabled');
    await userEvent.click(b);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('Button: onTint', () => {
  it('marks the ghost for a tinted ground only when asked, and never reaches the DOM as an attribute', () => {
    render(
      <>
        <Button variant="ghost">Plain</Button>
        <Button variant="ghost" onTint>
          Tinted
        </Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Plain' })).not.toHaveClass('onTint');
    const tinted = screen.getByRole('button', { name: 'Tinted' });
    expect(tinted).toHaveClass('ghost', 'onTint');
    expect(tinted).not.toHaveAttribute('ontint');
  });
});
