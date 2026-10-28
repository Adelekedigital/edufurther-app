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
  it('draws the round shapes Messages uses: the pill chip and the count', () => {
    render(
      <>
        <Badge type="accent" size="sm" shape="pill">
          Next
        </Badge>
        <Badge shape="count">3</Badge>
      </>,
    );
    expect(screen.getByText('Next').className).toMatch(/pill/);
    expect(screen.getByText('3').className).toMatch(/count/);
  });
  it('defaults to the filled primary badge', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New').className).toMatch(/primary-filled/);
  });
  it('a leading icon is decorative: the badge reads as its label only', () => {
    const { container } = render(
      <Badge type="accent" color="green" icon="check_circle">
        You get 3 free sessions a month
      </Badge>,
    );
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(badge.firstElementChild).toHaveTextContent('check_circle');
    expect(screen.getByText('You get 3 free sessions a month')).toBe(badge);
  });
});
