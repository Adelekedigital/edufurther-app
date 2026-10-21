import { render, screen } from '@testing-library/react';
import { BookingModeLabel } from './BookingModeLabel';

describe('BookingModeLabel', () => {
  it('a request reads "Request to book" and says the mentor approves', () => {
    const { container } = render(<BookingModeLabel requiresConfirmation />);
    expect(container.textContent).toBe(
      'how_to_regRequest to book: the mentor approves each booking',
    );
    expect(screen.getByText('how_to_reg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText(': the mentor approves each booking')).toHaveClass('sr-only');
  });

  it('an instant type reads "Instant booking", confirmed right away', () => {
    const { container } = render(<BookingModeLabel requiresConfirmation={false} />);
    expect(container.textContent).toBe('boltInstant booking: confirmed right away');
    expect(screen.getByText('bolt')).toHaveAttribute('aria-hidden', 'true');
  });
});
