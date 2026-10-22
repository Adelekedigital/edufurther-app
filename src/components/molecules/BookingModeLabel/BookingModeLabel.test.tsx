import { render, screen } from '@testing-library/react';
import { BookingModeLabel } from './BookingModeLabel';

describe('BookingModeLabel', () => {
  // The computed name, not the markup (failure mode #51): one whole string.
  it('a request reads "Request to book: the mentor approves each booking"', () => {
    const { container } = render(<BookingModeLabel requiresConfirmation />);
    expect(
      screen.getByRole('img', { name: 'Request to book: the mentor approves each booking' }),
    ).toBeInTheDocument();
    expect(container.textContent).toBe('how_to_regRequest to book');
  });

  it('an instant type reads "Instant booking: confirmed right away"', () => {
    const { container } = render(<BookingModeLabel requiresConfirmation={false} />);
    expect(
      screen.getByRole('img', { name: 'Instant booking: confirmed right away' }),
    ).toBeInTheDocument();
    expect(container.textContent).toBe('boltInstant booking');
  });
});
