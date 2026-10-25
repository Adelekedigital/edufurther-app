import { render, screen } from '@testing-library/react';
import { StatusLinkRow } from './StatusLinkRow';

describe('StatusLinkRow', () => {
  it('is one link whose name says the label and the value', () => {
    render(
      <StatusLinkRow
        icon="inbox"
        label="Booking requests"
        value="None yet"
        href="/bookings?tab=pending"
      />,
    );
    const link = screen.getByRole('link', { name: 'Booking requests: None yet' });
    expect(link).toHaveAttribute('href', '/bookings?tab=pending');
  });

  it('shows a loading value while it is unknown, and still links', () => {
    render(
      <StatusLinkRow
        icon="event_available"
        label="Available times, next 14 days"
        value={null}
        href="/calendar"
      />,
    );
    const link = screen.getByRole('link', { name: /Available times, next 14 days: Loading/ });
    expect(link).toHaveAttribute('aria-busy', 'true');
  });
});
