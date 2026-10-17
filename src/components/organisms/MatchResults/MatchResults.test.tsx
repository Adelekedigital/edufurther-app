import { render, screen } from '@testing-library/react';
import type { AppError, Mentor } from '@/types/mentor';
import type { MentorMatch } from '@/types/onboarding';
import { MatchResults, type MatchResultsProps } from './MatchResults';

const mentor = (id: string, name: string): Mentor => ({
  id,
  profileHref: `/mentors/${id}`,
  name,
  firstName: name.split(' ')[0]!,
  initials: 'XX',
  photoUrl: null,
  photoFocus: null,
  tone: 1,
  degreeLine: 'MSc, Computer Science',
  institution: 'University of London',
  completedSessions: 23,
  reviewCount: 11,
  rating: 4.9,
  label: null,
  offer: 'free',
  nextAvailableAt: '2026-10-20T12:00:00Z',
  nextAvailableState: 'open',
  takingBookings: true,
  topics: [],
});

const match = (id: string, name: string, reasons: MentorMatch['reasons'] = []): MentorMatch => ({
  mentor: mentor(id, name),
  reasons,
  level: 'Master’s',
  studyCountry: 'United Kingdom',
});

const base: MatchResultsProps = {
  matches: [
    match('m1', 'Jesuah Mica', [
      { code: 'study_country', country: { id: 'gb', label: 'United Kingdom' } },
      { code: 'degree', level: 'Master’s' },
    ]),
    match('m2', 'Adebanjo Maria'),
  ],
  exact: true,
  basis: {
    degree: 'Master’s',
    field: 'Computer Science',
    country: 'United Kingdom',
    origin: 'Ghana',
  },
  isLoading: false,
  error: null,
  onRetry: vi.fn(),
  highlight: [],
  compact: false,
  timeZone: 'UTC',
  offline: false,
  onBook: vi.fn(),
  onEdit: vi.fn(),
  browseHref: '/explore',
};

const failed: AppError = { kind: 'server', message: 'x' };

describe('MatchResults', () => {
  it('shows each match with its reason line and the basis', () => {
    render(<MatchResults {...base} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Your top 2 mentor matches',
    );
    expect(screen.getByText('Studied in the UK')).toBeInTheDocument();
    expect(screen.getByText(/· Master’s$/)).toBeInTheDocument();
    // No reason: the mentor's own level and country, with the info icon.
    expect(screen.getByText('Master’s · the UK')).toBeInTheDocument();
    expect(
      screen.getByText('Based on: Master’s Computer Science in the UK · from Ghana'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Browse all mentors/ })).toHaveAttribute(
      'href',
      '/explore',
    );
  });

  it('says when nobody matches exactly', () => {
    render(<MatchResults {...base} exact={false} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('No exact matches yet');
  });

  it('adds the note under a single match', () => {
    render(<MatchResults {...base} matches={base.matches.slice(0, 1)} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your top mentor match');
    expect(screen.getByText(/the one closest fit right now/)).toBeInTheDocument();
  });

  it('shows the loading cards', () => {
    render(<MatchResults {...base} matches={[]} isLoading />);
    expect(screen.getByRole('status')).toHaveTextContent('Finding your mentors');
  });

  it('checks the error before the empty list', () => {
    render(<MatchResults {...base} matches={[]} error={failed} />);
    expect(screen.getByText('We couldn’t load your matches')).toBeInTheDocument();
    expect(screen.queryByText('No mentors are taking bookings right now')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t load your matches');
    screen.getByRole('button', { name: 'Try again' }).click();
    expect(base.onRetry).toHaveBeenCalled();
  });

  it('announces the results and goes back to edit the answers', () => {
    render(<MatchResults {...base} />);
    expect(screen.getByRole('status')).toHaveTextContent('Your top 2 mentor matches');
    screen.getByRole('button', { name: 'Edit your answers' }).click();
    expect(base.onEdit).toHaveBeenCalled();
  });

  it('shows no reason line when there is nothing to say', () => {
    const bare = { ...match('m3', 'Kofi Asante'), level: null, studyCountry: null };
    render(<MatchResults {...base} matches={[bare]} />);
    expect(document.querySelector('li > p')).toBeNull();
  });

  it('offers Explore when nobody is bookable', () => {
    render(<MatchResults {...base} matches={[]} />);
    expect(screen.getByText('No mentors are taking bookings right now')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse all mentors' })).toHaveAttribute(
      'href',
      '/explore',
    );
  });
});
