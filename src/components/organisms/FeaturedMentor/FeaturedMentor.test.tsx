import { render, screen } from '@testing-library/react';
import type { FeaturedMentor as Featured } from '@/types/mentor';
import { FeaturedMentor } from './FeaturedMentor';

const featured: Featured = {
  id: 'm1',
  profileHref: '/mentors/m1',
  name: 'Aderewa Oluchi',
  firstName: 'Aderewa',
  initials: 'AO',
  photoUrl: null,
  photoFocus: null,
  tone: 2,
  degreeLine: 'MSc, Public Health',
  institution: 'University of London',
  completedSessions: 122,
  reviewCount: 34,
  rating: 4.9,
  label: 'top-rated',
  offer: 'free',
  nextAvailableAt: '2026-10-01T09:00:00Z',
  nextAvailableState: 'open',
  takingBookings: true,
  topics: [],
  bio: null,
};

describe('FeaturedMentor', () => {
  it('a featured mentor who just stopped taking bookings gets View profile, not Book', () => {
    const onBook = vi.fn();
    render(
      <FeaturedMentor
        mentor={{ ...featured, takingBookings: false }}
        onBook={onBook}
        timeZone="UTC"
      />,
    );
    expect(screen.getByRole('link', { name: /View profile/ })).toHaveAttribute(
      'href',
      '/mentors/m1',
    );
    expect(screen.queryByRole('button', { name: /Book session/ })).toBeNull();
  });

  it('a bookable one keeps Book', () => {
    render(<FeaturedMentor mentor={featured} onBook={vi.fn()} timeZone="UTC" />);
    expect(screen.getByRole('button', { name: /Book session with Aderewa/ })).toBeInTheDocument();
  });
});
