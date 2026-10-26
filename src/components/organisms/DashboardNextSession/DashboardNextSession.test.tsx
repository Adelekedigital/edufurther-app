import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardNextSession } from './DashboardNextSession';

describe('DashboardNextSession', () => {
  it('is a region named by its h2, with the head actions before All bookings', () => {
    render(
      <DashboardNextSession headActions={<button type="button">Tips</button>}>
        <p>Body</p>
      </DashboardNextSession>,
    );
    const region = screen.getByRole('region', { name: 'Next session' });
    expect(screen.getByRole('heading', { level: 2, name: 'Next session' })).toBeInTheDocument();
    expect(region).toHaveTextContent('Body');
    const tips = within(region).getByRole('button', { name: 'Tips' });
    const all = within(region).getByRole('link', { name: 'All bookings' });
    expect(tips.compareDocumentPosition(all) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('link', { name: 'All bookings' })).toHaveAttribute('href', '/bookings');
  });

  it('as a hero band, is an h3 and not a landmark of its own', () => {
    render(
      <DashboardNextSession variant="hero">
        <p>Body</p>
      </DashboardNextSession>,
    );
    expect(screen.queryByRole('region')).toBeNull();
    expect(screen.getByRole('heading', { level: 3, name: 'Next session' })).toBeInTheDocument();
  });
});
