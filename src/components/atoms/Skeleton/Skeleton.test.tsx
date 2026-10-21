import { render } from '@testing-library/react';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('is decorative, sized inline, small radius by default', () => {
    const { container } = render(<Skeleton width="40px" height="12px" />);
    const block = container.firstElementChild as HTMLElement;
    expect(block).toHaveAttribute('aria-hidden', 'true');
    expect(block).toHaveClass('block', 'sm');
    expect(block.style.width).toBe('40px');
    expect(block.style.height).toBe('12px');
  });

  it('takes each radius, xl included (the cards it stands in for)', () => {
    for (const radius of ['sm', 'md', 'lg', 'xl', 'full'] as const) {
      const { container, unmount } = render(<Skeleton radius={radius} />);
      expect(container.firstElementChild).toHaveClass(radius);
      unmount();
    }
  });
});
