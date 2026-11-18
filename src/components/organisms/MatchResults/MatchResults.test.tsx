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
  cover: 'sky',
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
  isLoading: false,
  error: null,
  onRetry: vi.fn(),
  highlight: [],
  compact: false,
  timeZone: 'UTC',
  offline: false,
  onBook: vi.fn(),
  onSkip: vi.fn(),
  starterFree: false,
  browseHref: '/explore',
};

const failed: AppError = { kind: 'server', message: 'x' };

describe('MatchResults', () => {
  it('shows each match with its reason line, and no "Based on" row (owner 2026-11-18)', () => {
    render(<MatchResults {...base} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Your top 2 mentor matches',
    );
    expect(screen.getByText('Studied in the United Kingdom')).toBeInTheDocument();
    expect(screen.getByText(/· Master’s$/)).toBeInTheDocument();
    // No reason: the mentor's own level and country, with the info icon.
    expect(screen.getByText('Master’s · the United Kingdom')).toBeInTheDocument();
    expect(screen.queryByText(/Based on/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit your answers' })).toBeNull();
    expect(screen.getByRole('link', { name: /Browse all mentors/ })).toHaveAttribute(
      'href',
      '/explore',
    );
  });

  it('leads with the nearest fits when nobody matches exactly (MatchSkip.dc.html)', () => {
    render(<MatchResults {...base} exact={false} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Mentors close to your goals',
    );
    expect(screen.getByText('Your nearest fits. More as new mentors join.')).toBeInTheDocument();
  });

  it('Skip for now is a 44px text button at the top, before the heading, and calls onSkip', () => {
    const onSkip = vi.fn();
    render(<MatchResults {...base} onSkip={onSkip} />);
    const skip = screen.getByRole('button', { name: 'Skip for now' });
    expect(skip).toHaveClass('skip');
    // First in the reading and focus order, as it is drawn (top right).
    expect(
      skip.compareDocumentPosition(screen.getByRole('heading', { level: 1 })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    skip.click();
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('no Skip without onSkip (the guest booking path)', () => {
    render(
      <MatchResults {...base} onSkip={undefined} guest={{ firstName: 'Ada', available: true }} />,
    );
    expect(screen.queryByRole('button', { name: 'Skip for now' })).toBeNull();
  });

  it('Skip stays while loading and after a failed load', () => {
    const { rerender } = render(<MatchResults {...base} matches={[]} isLoading />);
    expect(screen.getByRole('button', { name: 'Skip for now' })).toBeInTheDocument();
    rerender(<MatchResults {...base} matches={[]} error={failed} />);
    expect(screen.getByRole('button', { name: 'Skip for now' })).toBeInTheDocument();
  });

  it('"First session free" under every card only while the starter credit is unused', () => {
    const { rerender } = render(<MatchResults {...base} starterFree />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    for (const li of items) expect(li).toHaveTextContent('First session free');
    rerender(<MatchResults {...base} starterFree={false} />);
    expect(screen.queryByText('First session free')).toBeNull();
  });

  it('reveals the heading, then each card (classes the CSS animates; none on loading)', () => {
    const { rerender } = render(<MatchResults {...base} matches={[]} isLoading />);
    expect(screen.getByRole('heading', { level: 1 }).parentElement).not.toHaveClass('reveal');
    rerender(<MatchResults {...base} />);
    expect(screen.getByRole('heading', { level: 1 }).parentElement).toHaveClass('reveal');
    for (const li of screen.getAllByRole('listitem')) expect(li).toHaveClass('reveal');
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

  it('announces the results', () => {
    render(<MatchResults {...base} />);
    expect(screen.getByRole('status')).toHaveTextContent('Your top 2 mentor matches');
  });

  it('shows no reason line when there is nothing to say', () => {
    const bare = { ...match('m3', 'Kofi Asante'), level: null, studyCountry: null };
    render(<MatchResults {...base} matches={[bare]} />);
    expect(document.querySelector('li > p')).toBeNull();
  });

  it('offers Explore when nobody is bookable', () => {
    render(<MatchResults {...base} matches={[]} />);
    expect(screen.getByText('No mentors are taking bookings right now')).toBeInTheDocument();
    expect(
      screen.getByText('Your answers are saved. Browse all mentors to see who’s on EduFurther.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your matches');
    expect(screen.getByRole('link', { name: 'Browse all mentors' })).toHaveAttribute(
      'href',
      '/explore',
    );
  });

  it('shows a guest only their mentor, with no one-match note', () => {
    render(
      <MatchResults
        {...base}
        matches={[match('m1', 'Jesuah Mica')]}
        guest={{ firstName: 'Jesuah', available: true }}
      />,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'You’re all set to book Jesuah',
    );
    expect(
      screen.getByText('Your time and session are saved. Book now and Jesuah will see your goals.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/isn’t taking new bookings/)).toBeNull();
    expect(screen.queryByText(/one closest fit/)).toBeNull();
  });

  it('tells a guest their mentor is unavailable, then shows the others', () => {
    render(<MatchResults {...base} guest={{ firstName: 'Ada', available: false }} />);
    expect(screen.getByText('Ada isn’t taking new bookings right now')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Mentors who fit your goals',
    );
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2);
  });

  it('shows no unavailable notice while loading or failed', () => {
    const { rerender } = render(
      <MatchResults {...base} isLoading guest={{ firstName: 'Ada', available: false }} />,
    );
    expect(screen.queryByText(/isn’t taking new bookings/)).toBeNull();
    rerender(
      <MatchResults {...base} error={failed} guest={{ firstName: 'Ada', available: false }} />,
    );
    expect(screen.queryByText(/isn’t taking new bookings/)).toBeNull();
  });
});
