import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MoveRow } from './MoveRow';

const base = {
  icon: 'share' as const,
  title: 'Share your profile',
  why: 'Why.',
  doneLabel: 'Done this week',
};

describe('MoveRow', () => {
  it('a button action runs its handler', async () => {
    const onClick = vi.fn();
    render(
      <MoveRow
        {...base}
        done={false}
        action={{ label: 'Copy link', variant: 'primary', onClick }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(onClick).toHaveBeenCalled();
  });

  it('a route action is a link that runs its handler first', async () => {
    const onClick = vi.fn((e?: unknown) => (e as Event | undefined)?.preventDefault?.());
    render(
      <MoveRow
        {...base}
        done={false}
        action={{ label: 'Add hours', variant: 'secondary-outlined', href: '/calendar', onClick }}
      />,
    );
    const link = screen.getByRole('link', { name: 'Add hours' });
    expect(link).toHaveAttribute('href', '/calendar');
    await userEvent.click(link);
    expect(onClick).toHaveBeenCalled();
  });

  it('focus follows to the done mark when the focused action is replaced', async () => {
    const action = { label: 'Copy link', variant: 'primary' as const, onClick: vi.fn() };
    const { rerender } = render(<MoveRow {...base} done={false} action={action} />);
    screen.getByRole('button', { name: 'Copy link' }).focus();
    rerender(<MoveRow {...base} done action={action} />);
    expect(screen.getByText('Done this week')).toHaveFocus();
  });

  it('done: the action gives way to the done mark', () => {
    render(
      <MoveRow
        {...base}
        done
        action={{ label: 'Copy link', variant: 'primary', onClick: vi.fn() }}
      />,
    );
    expect(screen.getByText('Done this week')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
