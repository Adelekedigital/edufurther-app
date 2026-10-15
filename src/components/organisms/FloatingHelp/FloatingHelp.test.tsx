import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FloatingHelp } from './FloatingHelp';

const base = {
  title: 'Not sure which mentor to choose?',
  label: 'Talk to us',
  sheetLabel: 'Book a free call',
  body: 'Book a free 15-min call with our team.',
  onAction: () => {},
};

describe('FloatingHelp', () => {
  it('renders nothing when not shown', () => {
    render(<FloatingHelp {...base} show={false} />);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('shows the pill with the title and action, and fires onAction', async () => {
    const onAction = vi.fn();
    render(<FloatingHelp {...base} show onAction={onAction} />);
    expect(screen.getByRole('complementary', { name: base.title })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Talk to us' }));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('collapses to an icon when dismissed (focus follows), then reopens', async () => {
    render(<FloatingHelp {...base} show />);
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    // The full pill is gone; a mini button offers to show it again — and focus
    // moves to it, not to <body>.
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    const mini = screen.getByRole('button', { name: /Show/ });
    expect(mini).toHaveFocus();
    await userEvent.click(mini);
    expect(screen.getByRole('complementary', { name: base.title })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Talk to us' })).toHaveFocus();
  });

  it('on mobile the icon opens a disclosure sheet, and its action fires', async () => {
    const onAction = vi.fn();
    render(<FloatingHelp {...base} show mobile onAction={onAction} />);
    // On mobile the full pill shows at rest; dismiss to the icon.
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    const mini = screen.getByRole('button', { name: base.title });
    expect(mini).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(mini);
    expect(mini).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(base.body)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Book a free call' }));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('Escape closes the sheet', async () => {
    render(<FloatingHelp {...base} show mobile />);
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    await userEvent.click(screen.getByRole('button', { name: base.title }));
    expect(screen.getByText(base.body)).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText(base.body)).not.toBeInTheDocument();
  });
});
