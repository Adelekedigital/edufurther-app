import { render, screen, within } from '@testing-library/react';
import { toSimilarMentor } from '@/lib/api/data/similar';
import { formatFreeDay, inSentence } from '@/lib/utils/format';
import { SimilarMentorsCard } from './SimilarMentorsCard';
import { similarMentors } from './similar.fixture';

describe('SimilarMentorsCard', () => {
  it('lists each mentor: name link, New badge, degree and school, shared topic, next free day', () => {
    render(
      <SimilarMentorsCard
        mentors={similarMentors}
        isLoading={false}
        timeZone="UTC"
        seeAllHref="/explore"
      />,
    );
    expect(screen.getByRole('heading', { name: 'Similar mentors' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^See all\s*mentors$/ })).toHaveAttribute(
      'href',
      '/explore',
    );
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    const first = within(rows[0]!);
    expect(first.getByRole('link', { name: 'Oluwakemi Olayinka' })).toHaveAttribute(
      'href',
      '/mentors/oluwakemi-olayinka',
    );
    expect(first.getByText('MA, Leipzig University')).toBeInTheDocument();
    expect(first.getByText('4.8')).toBeInTheDocument();
    expect(first.getByText('Also helps with statement of purpose')).toBeInTheDocument();
    expect(
      first.getByRole('link', { name: /^Free \w+\s*with Oluwakemi Olayinka$/ }),
    ).toBeInTheDocument();
    // A new mentor: the badge, and no star rating without reviews.
    const third = within(rows[2]!);
    expect(third.getByText('New')).toBeInTheDocument();
    expect(third.queryByText(/out of 5/)).not.toBeInTheDocument();
  });

  it('leaves out "Free {day}" when nothing is open', () => {
    render(
      <SimilarMentorsCard
        mentors={[similarMentors[1]!]}
        isLoading={false}
        timeZone="UTC"
        seeAllHref="/explore"
      />,
    );
    expect(screen.queryByRole('link', { name: /^Free/ })).not.toBeInTheDocument();
  });

  it('loading: skeleton rows and a status', () => {
    render(<SimilarMentorsCard mentors={null} isLoading timeZone="UTC" seeAllHref="/explore" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading similar mentors');
  });

  it('renders nothing when the list is empty or failed', () => {
    const { container, rerender } = render(
      <SimilarMentorsCard mentors={[]} isLoading={false} timeZone="UTC" seeAllHref="/explore" />,
    );
    expect(container).toBeEmptyDOMElement();
    rerender(
      <SimilarMentorsCard mentors={null} isLoading={false} timeZone="UTC" seeAllHref="/explore" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('formatFreeDay', () => {
  const now = new Date('2026-09-28T10:00:00Z'); // a Monday
  it('today, tomorrow, a weekday within the week, then a date', () => {
    expect(formatFreeDay('2026-09-28T16:00:00Z', 'UTC', now)).toBe('Free today');
    expect(formatFreeDay('2026-09-29T09:00:00Z', 'UTC', now)).toBe('Free tomorrow');
    expect(formatFreeDay('2026-10-01T09:00:00Z', 'UTC', now)).toBe('Free Thu');
    expect(formatFreeDay('2026-10-09T09:00:00Z', 'UTC', now)).toBe('Free Oct 9');
  });
  it('reads the day in the viewer’s zone', () => {
    // 23:30 UTC Monday is already Tuesday in Lagos (UTC+1).
    expect(formatFreeDay('2026-09-28T23:30:00Z', 'Africa/Lagos', now)).toBe('Free tomorrow');
  });
});

describe('inSentence', () => {
  it('lowercases a leading capital, keeps acronyms', () => {
    expect(inSentence('Visa and interview')).toBe('visa and interview');
    expect(inSentence('CV review')).toBe('CV review');
    expect(inSentence('SOP drafts')).toBe('SOP drafts');
  });
});

describe('toSimilarMentor', () => {
  it('maps the row: degree and school, the shared offering, Explore’s rules', () => {
    const s = toSimilarMentor({
      id: 'm2',
      slug: 'ademola-daniels',
      first_name: 'Ademola',
      last_name: 'Daniels',
      degree: 'PhD',
      study_course: 'Sociology',
      institution: 'University of Toronto',
      completed_sessions: 1,
      review_count: 0,
      session_value: null,
      next_available_state: 'open',
      next_available_at: '2026-10-03T09:00:00Z',
      joined_at: '2026-09-01T12:00:00Z',
      shared_offering: { slug: 'visa-and-interview', display_name: 'Visa and interview' },
    });
    expect(s.meta).toBe('PhD, University of Toronto');
    expect(s.sharedTopic).toBe('Visa and interview');
    expect(s.mentor).toMatchObject({
      label: 'new',
      rating: null,
      profileHref: '/mentors/ademola-daniels',
    });
  });
});
