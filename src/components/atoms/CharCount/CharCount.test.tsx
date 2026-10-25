import { render, screen } from '@testing-library/react';
import { CharCount } from './CharCount';

describe('CharCount', () => {
  it('says nothing until there is something to count', () => {
    const { container } = render(<CharCount count={0} max={1000} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('counts against the limit, darker near it', () => {
    const { rerender } = render(<CharCount count={12} max={1000} />);
    expect(screen.getByText('12 / 1000')).not.toHaveClass('near');
    rerender(<CharCount count={950} max={1000} />);
    expect(screen.getByText('950 / 1000')).toHaveClass('near');
  });
});
