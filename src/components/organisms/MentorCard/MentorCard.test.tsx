import { render, screen } from '@testing-library/react';
import type { Mentor } from '@/types/mentor';
import { MentorCard } from './MentorCard';

const mentor = (over: Partial<Mentor> = {}): Mentor => ({
  id: 'm1',
  profileHref: '/mentors/m1',
  name: 'Olajuwon Samuel',
  firstName: 'Olajuwon',
  initials: 'OS',
  photoUrl: null,
  photoFocus: null,
  tone: 1,
  degreeLine: 'MSc, Computer Science',
  institution: 'University of London',
  completedSessions: 23,
  reviewCount: 11,
  rating: 4.9,
  label: 'top-rated',
  offer: 'free',
  nextAvailableAt: '2026-09-28T12:00:00Z',
  nextAvailableState: 'open',
  takingBookings: true,
  topics: [{ slug: 'application-documents', label: 'Application documents' }],
  ...over,
});

describe('MentorCard, not taking bookings', () => {
  // The compact card is the profile's suggestion grid: it must not open a dead booking either.
  it.each(['photo', 'compact'] as const)(
    '%s: says so, and offers the profile instead of Book',
    (variant) => {
      const onBook = vi.fn();
      render(
        <MentorCard
          mentor={mentor({ takingBookings: false })}
          onBook={onBook}
          timeZone="UTC"
          variant={variant}
        />,
      );
      expect(screen.getByText('Not taking bookings')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'View profile: Olajuwon Samuel' })).toHaveAttribute(
        'href',
        '/mentors/m1',
      );
      expect(screen.queryByRole('button')).toBeNull();
    },
  );

  // Not taking bookings is checked before offline and a blocked viewer, whose labels would show otherwise.
  it.each([
    ['offline', { offline: true }],
    ['a blocked viewer', { bookBlocked: 'Log in to book' }],
  ] as const)('%s still gets View profile, never a Book button', (_label, extra) => {
    render(
      <MentorCard
        mentor={mentor({ takingBookings: false })}
        onBook={vi.fn()}
        timeZone="UTC"
        {...extra}
      />,
    );
    expect(screen.getByRole('link', { name: 'View profile: Olajuwon Samuel' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
