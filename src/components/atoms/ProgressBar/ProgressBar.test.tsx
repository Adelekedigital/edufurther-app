import { render, screen } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('exposes a named progressbar with the rounded, clamped value', () => {
    render(<ProgressBar value={42.6} aria-label="Account setup progress" />);
    const bar = screen.getByRole('progressbar', { name: 'Account setup progress' });
    expect(bar).toHaveAttribute('aria-valuenow', '43');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('clamps out-of-range values', () => {
    const { rerender } = render(<ProgressBar value={-10} aria-label="p" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    rerender(<ProgressBar value={140} aria-label="p" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('shows a percent label only when asked', () => {
    const { rerender } = render(<ProgressBar value={75} aria-label="p" />);
    expect(screen.queryByText('75%')).not.toBeInTheDocument();
    rerender(<ProgressBar value={75} aria-label="p" showLabel />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });
});
