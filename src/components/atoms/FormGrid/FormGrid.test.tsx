import { render, screen } from '@testing-library/react';
import { FormGrid } from './FormGrid';

describe('FormGrid', () => {
  it('is a grid with the 16px gap by default, keeping the caller’s class and attributes', () => {
    render(
      <FormGrid className="mine" data-testid="grid">
        <span>One</span>
      </FormGrid>,
    );
    const grid = screen.getByTestId('grid');
    expect(grid).toHaveClass('grid', 'gap4', 'mine');
    expect(grid).toHaveTextContent('One');
  });

  it('takes the 12px gap', () => {
    render(<FormGrid gap={3} data-testid="grid" />);
    expect(screen.getByTestId('grid')).toHaveClass('grid', 'gap3');
  });
});
