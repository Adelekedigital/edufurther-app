import { render, screen } from '@testing-library/react';
import { FloatingPill } from './FloatingPill';

const box = () => screen.getByRole('button', { name: 'Act' }).parentElement!;

describe('FloatingPill', () => {
  it('places what it holds at the bottom it is given, centred by default', () => {
    render(
      <FloatingPill bottom="calc(72px + env(safe-area-inset-bottom))">
        <button type="button">Act</button>
      </FloatingPill>,
    );
    expect(box()).toHaveClass('float');
    expect(box()).not.toHaveClass('corner');
    expect(box().style.getPropertyValue('--pill-bottom')).toBe(
      'calc(72px + env(safe-area-inset-bottom))',
    );
  });

  it('docks to the corner, and drops the bottom transition while tracking', () => {
    render(
      <FloatingPill bottom="24px" dock="corner" tracking className="extra">
        <button type="button">Act</button>
      </FloatingPill>,
    );
    expect(box()).toHaveClass('float', 'corner', 'tracking', 'extra');
  });

  it('adds no role or name of its own: the control inside is what is heard', () => {
    render(
      <FloatingPill bottom="24px">
        <button type="button">Act</button>
      </FloatingPill>,
    );
    expect(box()).not.toHaveAttribute('role');
    expect(box()).not.toHaveAttribute('aria-label');
  });
});
