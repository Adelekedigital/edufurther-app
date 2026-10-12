import { render, screen } from '@testing-library/react';
import { Card, cardClass } from './Card';

describe('Card', () => {
  it('renders the element asked for, with its own attributes and the caller’s class', () => {
    render(
      <Card as="section" aria-label="Weekly hours" className="mine">
        Body
      </Card>,
    );
    const card = screen.getByRole('region', { name: 'Weekly hours' });
    expect(card.tagName).toBe('SECTION');
    expect(card).toHaveClass('card', 'lg', 'mine');
  });

  it('a tone and a padding are classes; none leaves the padding to the caller', () => {
    expect(cardClass({ tone: 'info', padding: 'md' }).split(' ')).toEqual(['card', 'info', 'md']);
    expect(cardClass({ padding: 'none' })).toBe('card');
  });
});
