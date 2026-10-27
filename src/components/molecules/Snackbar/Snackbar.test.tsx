import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Snackbar } from './Snackbar';

describe('Snackbar', () => {
  it('the region is there first; the same words again are put in afresh', () => {
    const { rerender } = render(<Snackbar message={null} />);
    const region = screen.getByRole('status');
    expect(region).toBeEmptyDOMElement();
    rerender(<Snackbar message="Education updated" stamp={1} />);
    const first = region.firstElementChild;
    expect(region).toHaveTextContent('Education updated');
    rerender(<Snackbar message="Education updated" stamp={2} />);
    expect(screen.getByRole('status')).toBe(region);
    expect(region.firstElementChild).not.toBe(first);
  });
});

describe('Snackbar with two panels kept mounted', () => {
  it('only the newest outcome shows, so toasts never stack', () => {
    const { rerender } = render(
      <>
        <Snackbar message="Profile saved" stamp={1} />
        <Snackbar message={null} />
      </>,
    );
    rerender(
      <>
        <Snackbar message="Profile saved" stamp={1} />
        <Snackbar message="Goals saved" stamp={1} />
      </>,
    );
    expect(screen.queryByText('Profile saved')).toBeNull();
    expect(screen.getByText('Goals saved')).toBeInTheDocument();
  });
});

describe('Snackbar with an action', () => {
  it('shows the action beside the message, runs it, and can take focus when it shows', async () => {
    const onClick = vi.fn();
    render(
      <Snackbar
        message="Getting started hidden"
        stamp={1}
        action={{ label: 'Undo', onClick, focus: true }}
      />,
    );
    const undo = screen.getByRole('button', { name: 'Undo' });
    expect(undo).toHaveFocus();
    await userEvent.click(undo);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('without focus asked, it leaves focus where it is', () => {
    render(<Snackbar message="Saved" stamp={1} action={{ label: 'Undo', onClick: vi.fn() }} />);
    expect(screen.getByRole('button', { name: 'Undo' })).not.toHaveFocus();
  });
});

describe('Snackbar with a tone', () => {
  it('draws the glyph for the outcome, and none without a tone', () => {
    const { rerender } = render(<Snackbar message="2 credits added" stamp={1} tone="success" />);
    const region = screen.getByRole('status');
    expect(region).toHaveTextContent('2 credits added');
    expect(region.querySelector('[aria-hidden="true"]')).toHaveTextContent('check_circle');
    rerender(<Snackbar message="That didn’t go through." stamp={2} tone="error" />);
    expect(region.querySelector('[aria-hidden="true"]')).toHaveTextContent('error');
    rerender(<Snackbar message="Profile saved" stamp={3} />);
    expect(region.querySelector('[aria-hidden="true"]')).toBeNull();
  });
});
