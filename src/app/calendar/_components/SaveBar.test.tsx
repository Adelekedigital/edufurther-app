import { render, screen } from '@testing-library/react';
import { SaveBar } from './SaveBar';

describe('SaveBar', () => {
  // Sticky over the hours as they scroll: without the card surface it is see-through (review of #220).
  it('draws the card surface under its message and buttons', () => {
    render(<SaveBar saving={false} problem={null} onDiscard={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByRole('region', { name: 'Unsaved changes' })).toHaveClass('card', 'saveBar');
  });
});
