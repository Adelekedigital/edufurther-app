import { render } from '@testing-library/react';
import { Star } from './Star';

describe('Star', () => {
  it('is decorative and sized from its prop', () => {
    const { container } = render(<Star size={10} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(svg.style.getPropertyValue('--star-size')).toBe('10px');
  });

  it('draws in the current colour, with the design star.svg box', () => {
    const { container } = render(<Star />);
    expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 13.996 13.437');
    expect(container.querySelector('path')).toHaveAttribute('fill', 'currentColor');
  });
});
