import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  cover: 'sky',
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

describe('MentorCard, topics', () => {
  const topics = [
    { slug: 'school-selection', label: 'School selection' },
    { slug: 'program-selection', label: 'Program selection' },
    { slug: 'document-preparation', label: 'Document preparation' },
    { slug: 'scholarships-financial-aid', label: 'Scholarships' },
    { slug: 'test-preparation', label: 'Test preparation' },
  ];

  it('shows the highlighted topics first, three at most, then "+N"', () => {
    render(
      <MentorCard
        mentor={mentor({ topics })}
        onBook={vi.fn()}
        timeZone="UTC"
        highlight={['test-preparation', 'scholarships-financial-aid']}
      />,
    );
    const shown = screen.getByRole('list', { name: 'Helps with' });
    expect(
      Array.from(shown.querySelectorAll('li:not(:has(button))')).map((li) => li.textContent),
    ).toEqual(['Scholarships', 'Test preparation', 'School selection']);
    expect(
      screen.getByRole('button', { name: '+2: show all 5 areas Olajuwon helps with' }),
    ).toHaveTextContent('+2');
  });

  it('opens every area in a popover that Escape closes', async () => {
    const user = userEvent.setup();
    render(<MentorCard mentor={mentor({ topics })} onBook={vi.fn()} timeZone="UTC" />);
    const more = screen.getByRole('button', { name: /show all 5 areas/ });
    await user.click(more);
    expect(more).toHaveAttribute('aria-expanded', 'true');
    const region = screen.getByRole('region', { name: 'Olajuwon can help with' });
    expect(region).toHaveFocus();
    expect(screen.getByRole('list', { name: 'Funding' })).toHaveTextContent('Scholarships');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('region')).toBeNull();
    expect(more).toHaveFocus();
  });

  it('shows no "+N" with three topics or fewer', () => {
    render(
      <MentorCard
        mentor={mentor({ topics: topics.slice(0, 3) })}
        onBook={vi.fn()}
        timeZone="UTC"
      />,
    );
    expect(screen.queryByRole('button', { name: /show all/ })).toBeNull();
  });
});
