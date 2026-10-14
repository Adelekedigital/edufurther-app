import { render, screen } from '@testing-library/react';
import { ProgressCircle } from './ProgressCircle';

describe('ProgressCircle', () => {
  it('names the ring with the rounded value, as one image', () => {
    render(<ProgressCircle value={93.6} aria-label="Show-up rate" />);
    const ring = screen.getByRole('img', { name: 'Show-up rate 94%' });
    expect(ring).toBeInTheDocument();
  });

  it('clamps out-of-range values in both the name and the label', () => {
    const { rerender } = render(<ProgressCircle value={-10} aria-label="Rate" />);
    expect(screen.getByRole('img', { name: 'Rate 0%' })).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    rerender(<ProgressCircle value={140} aria-label="Rate" />);
    expect(screen.getByRole('img', { name: 'Rate 100%' })).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('shows the percent label by default and hides it on request', () => {
    const { rerender } = render(<ProgressCircle value={75} aria-label="Rate" />);
    expect(screen.getByText('75%')).toBeInTheDocument();
    rerender(<ProgressCircle value={75} aria-label="Rate" showLabel={false} />);
    expect(screen.queryByText('75%')).not.toBeInTheDocument();
    // The name still carries the value when the visible label is off.
    expect(screen.getByRole('img', { name: 'Rate 75%' })).toBeInTheDocument();
  });

  it('draws the arc shorter as the value falls (dashoffset grows)', () => {
    const { container, rerender } = render(<ProgressCircle value={100} aria-label="Rate" />);
    const arc = () => {
      const el = container.querySelectorAll('circle')[1];
      if (!el) throw new Error('value arc not rendered');
      return el;
    };
    const full = Number(arc().getAttribute('stroke-dashoffset'));
    expect(full).toBeCloseTo(0, 5);
    rerender(<ProgressCircle value={0} aria-label="Rate" />);
    const empty = Number(arc().getAttribute('stroke-dashoffset'));
    const dash = Number(arc().getAttribute('stroke-dasharray'));
    expect(empty).toBeCloseTo(dash, 5);
  });
});
