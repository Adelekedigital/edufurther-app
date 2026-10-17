import { render, screen } from '@testing-library/react';
import { Toast } from './Toast';

describe('Toast', () => {
  it('keeps its status region mounted while closed, so the opening is announced', () => {
    const { rerender } = render(<Toast open={false} icon="login" title="Welcome back, Amara" />);
    const region = screen.getByRole('status');
    expect(region).toBeEmptyDOMElement();

    rerender(
      <Toast open icon="login" title="Welcome back, Amara">
        Opening your Home…
      </Toast>,
    );
    expect(screen.getByRole('status')).toBe(region);
    expect(region).toHaveTextContent('Welcome back, AmaraOpening your Home…');
  });

  it('hides its icon from assistive tech', () => {
    render(<Toast open icon="how_to_reg" title="Account created" />);
    expect(screen.getByText('how_to_reg')).toHaveAttribute('aria-hidden', 'true');
  });
});
