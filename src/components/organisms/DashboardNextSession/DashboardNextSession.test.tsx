import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardNextSession } from './DashboardNextSession';

describe('DashboardNextSession', () => {
  it('is a region named by its h2, with All bookings and the head actions first', () => {
    render(
      <DashboardNextSession headActions={<button type="button">Tips</button>}>
        <p>Body</p>
      </DashboardNextSession>,
    );
    const region = screen.getByRole('region', { name: 'Next session' });
    expect(screen.getByRole('heading', { level: 2, name: 'Next session' })).toBeInTheDocument();
    expect(region).toHaveTextContent('Body');
    const controls = [...region.querySelectorAll('a, button')].map((el) => el.textContent);
    expect(controls).toEqual(['Tips', 'All bookings']);
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
