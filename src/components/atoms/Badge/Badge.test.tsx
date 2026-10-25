import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('draws the colour and type it is given', () => {
    render(
      <Badge type="accent" color="orange" size="sm">
        Featured
      </Badge>,
    );
    expect(screen.getByText('Featured').className).toMatch(/orange-accent/);
    expect(screen.getByText('Featured').className).toMatch(/\bsm\b|_sm/);
  });
  it('draws the amber accent for warning', () => {
    render(
      <Badge type="accent" color="warning" size="sm">
        Needs attention
      </Badge>,
    );
    expect(screen.getByText('Needs attention').className).toMatch(/warning-accent/);
  });
  it('defaults to the filled primary badge', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New').className).toMatch(/primary-filled/);
  });
});
