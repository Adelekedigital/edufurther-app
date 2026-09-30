import { render, screen, within } from '@testing-library/react';
import { formatFreeDay, inSentence } from '@/lib/utils/format';
import { SimilarMentorsCard } from './SimilarMentorsCard';
import { similarMentors } from './similar.fixture';

describe('SimilarMentorsCard', () => {
  // The fixture's next times are fixed dates: pin "now" so "Free {day}" is stable.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-28T10:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

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
      first.getByRole('link', { name: /^Free Thu\s*with Oluwakemi Olayinka$/ }),
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
  const now = new Date('2026-09-28T10:00:00Z'); // Monday 10:00 UTC
  it('today, tomorrow, a weekday up to 6 days ahead, then a date', () => {
    expect(formatFreeDay('2026-09-28T16:00:00Z', 'UTC', now)).toBe('Free today');
    expect(formatFreeDay('2026-09-29T09:00:00Z', 'UTC', now)).toBe('Free tomorrow');
    expect(formatFreeDay('2026-10-01T09:00:00Z', 'UTC', now)).toBe('Free Thu');
    expect(formatFreeDay('2026-10-05T09:00:00Z', 'UTC', now)).toBe('Free Oct 5');
  });
  it('counts calendar days: the whole of day 6 reads alike (review of #31)', () => {
    expect(formatFreeDay('2026-10-04T09:59:00Z', 'UTC', now)).toBe('Free Sun');
    expect(formatFreeDay('2026-10-04T10:00:00Z', 'UTC', now)).toBe('Free Sun');
    expect(formatFreeDay('2026-10-04T23:00:00Z', 'UTC', now)).toBe('Free Sun');
  });
  it('a time already past reads as today, never as next week (review of #31)', () => {
    expect(formatFreeDay('2026-09-27T16:00:00Z', 'UTC', now)).toBe('Free today');
  });
  it('reads the day in the viewer’s zone', () => {
    // 23:30 UTC Monday is already Tuesday in Lagos (UTC+1).
    expect(formatFreeDay('2026-09-28T23:30:00Z', 'Africa/Lagos', now)).toBe('Free tomorrow');
  });
  it('a 25-hour DST day doesn’t skip "tomorrow" (review of #31)', () => {
    // New York falls back on Sun Nov 1, 2026 (a 25-hour day): from 00:30 that
    // Sunday, Monday is still tomorrow.
    const early = new Date('2026-11-01T04:30:00Z'); // Sun 00:30 EDT
    expect(formatFreeDay('2026-11-02T15:00:00Z', 'America/New_York', early)).toBe('Free tomorrow');
  });
});

describe('inSentence', () => {
  it('lowercases a leading capital, keeps acronyms', () => {
    expect(inSentence('Visa and interview')).toBe('visa and interview');
    expect(inSentence('CV review')).toBe('CV review');
    expect(inSentence('SOP drafts')).toBe('SOP drafts');
  });

  it('a mentor not taking bookings says so and offers the profile, not a free day (live design)', () => {
    const item = similarMentors[0]!;
    const m = { ...item.mentor, takingBookings: false };
    render(
      <SimilarMentorsCard
        mentors={[{ ...item, mentor: m }]}
        isLoading={false}
        timeZone="UTC"
        seeAllHref="/explore"
      />,
    );
    expect(screen.getByText(/Not taking bookings$/)).toBeInTheDocument();
    expect(screen.queryByText(/Also helps with/)).toBeNull();
    const link = screen.getByRole('link', { name: `View profile: ${m.name}` });
    expect(link).toHaveAttribute('href', m.profileHref);
    if (m.nextAvailableAt)
      expect(screen.queryByText(formatFreeDay(m.nextAvailableAt, 'UTC'))).toBeNull();
  });
});
