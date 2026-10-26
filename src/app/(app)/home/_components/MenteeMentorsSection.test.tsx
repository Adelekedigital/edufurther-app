import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MetMentor } from '@/lib/api/data/metMentors';
import type { Remote } from '@/types/mentor';
import { MenteeMentorsSection } from './MenteeMentorsSection';
import type { Recommended } from './recommended';
import { metHistory, MentorRow } from './MentorRow';

vi.mock('@/components/organisms/MentorCard/MentorCard', () => ({
  MentorCard: ({ mentor }: { mentor: { name: string } }) => <article aria-label={mentor.name} />,
}));

const remote = <T,>(data: T | null, over: Partial<Remote<T>> = {}): Remote<T> => ({
  data,
  isLoading: false,
  error: null,
  retry: vi.fn(),
  ...over,
});

let n = 0;
const mentor = (over: Partial<MetMentor> = {}): MetMentor => ({
  id: `m${++n}`,
  slug: 'a-mentor',
  name: `Mentor ${n}`,
  firstName: 'Mentor',
  initials: 'MN',
  cover: 'sky',
  avatarUrl: null,
  avatarFocus: null,
  degree: 'MSc, Public Health',
  institution: 'University of Edinburgh',
  sessionCount: 2,
  lastSessionAt: '2026-10-06T10:00:00Z',
  bookability: 'open',
  nextSessionAt: null,
  unavailableReason: null,
  ...over,
});

const rec = (name: string): Recommended => ({
  mentor: { id: name, name } as Recommended['mentor'],
  matchTopics: [],
});

const render_ = (
  mentors: Remote<MetMentor[]>,
  recommended: Recommended[] = [],
  over: { failed?: boolean; isLoading?: boolean } = {},
) => {
  const onBook = vi.fn();
  const onSeeAll = vi.fn();
  const view = render(
    <MenteeMentorsSection
      mentors={mentors}
      recommended={{ items: recommended, isLoading: !!over.isLoading, failed: !!over.failed }}
      goalLine="Scholarships & funding"
      timeZone="Africa/Lagos"
      compact={false}
      offline={false}
      bookBlocked={null}
      onBook={onBook}
      onBookMentor={vi.fn()}
      onSeeAll={onSeeAll}
    />,
  );
  return { onBook, onSeeAll, ...view };
};

beforeEach(() => {
  n = 0;
});

describe('MenteeMentorsSection', () => {
  it('renders nothing when nobody can be booked again and there are no matches', () => {
    const { container } = render_(remote([mentor({ bookability: 'unavailable' })]));
    expect(container).toBeEmptyDOMElement();
  });

  it('Book again lists only bookable mentors, three at most', () => {
    render_(
      remote([mentor(), mentor({ bookability: 'has_upcoming' }), mentor(), mentor(), mentor()]),
    );
    expect(screen.getAllByRole('button', { name: /^Book again with/ })).toHaveLength(3);
    expect(screen.queryByText('Mentor 2')).not.toBeInTheDocument();
  });

  it('an error keeps Book again with a retry, not an empty list', async () => {
    const mentors = remote<MetMentor[]>(null, { error: {} as never });
    render_(mentors);
    expect(screen.getByText(/couldn’t load your mentors/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(mentors.retry).toHaveBeenCalled();
  });

  it('"See all mentors" asks the screen to open Mentors you’ve met', async () => {
    const { onSeeAll } = render_(remote([mentor()]));
    await userEvent.click(screen.getByRole('button', { name: 'See all mentors' }));
    expect(onSeeAll).toHaveBeenCalledOnce();
  });

  it('with both, the tabs switch between the panels; Recommended shows three at most', async () => {
    render_(remote([mentor()]), [rec('A'), rec('B'), rec('C'), rec('D')]);
    expect(screen.getByRole('heading', { name: 'Mentors' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Recommended' }));
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.getByText('Matched to your goal: Scholarships & funding')).toBeInTheDocument();
  });

  it('while matches load, Recommended holds its place with skeleton cards', async () => {
    render_(remote([mentor()]), [], { isLoading: true });
    await userEvent.click(screen.getByRole('tab', { name: 'Recommended' }));
    expect(screen.getByRole('tabpanel')).toContainElement(
      document.querySelector('[aria-busy="true"]') as HTMLElement,
    );
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});

describe('MentorRow', () => {
  it('names when you last met, or the next booking when there is one', () => {
    expect(metHistory(mentor(), 'Africa/Lagos')).toBe('2 sessions · Last on Tue, Oct 6');
    expect(
      metHistory(
        mentor({
          bookability: 'has_upcoming',
          nextSessionAt: '2026-10-15T17:00:00Z',
          sessionCount: 1,
        }),
        'Africa/Lagos',
      ),
    ).toBe('1 session · Next on Thu, Oct 15');
    // No date from the backend yet: the booking is named instead.
    expect(metHistory(mentor({ bookability: 'pending' }), 'UTC')).toBe(
      '2 sessions · Request pending',
    );
  });

  it('routes each bookability: Book again, View booking, or a note', async () => {
    const onBook = vi.fn();
    const { rerender } = render(
      <MentorRow
        mentor={mentor({ name: 'Open One' })}
        timeZone="UTC"
        onBook={onBook}
        variant="modal"
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Book again with Open One' }));
    expect(onBook).toHaveBeenCalledOnce();
    rerender(
      <MentorRow
        mentor={mentor({ name: 'Pending One', bookability: 'pending' })}
        timeZone="UTC"
        onBook={onBook}
        variant="modal"
      />,
    );
    expect(screen.getByRole('link', { name: 'View booking with Pending One' })).toHaveAttribute(
      'href',
      '/bookings?tab=pending',
    );
    rerender(
      <MentorRow
        mentor={mentor({ bookability: 'unavailable', unavailableReason: 'no_open_times' })}
        timeZone="UTC"
        onBook={onBook}
        variant="modal"
      />,
    );
    expect(screen.getByText('No open times yet')).toBeInTheDocument();
    rerender(
      <MentorRow
        mentor={mentor({ bookability: 'unavailable' })}
        timeZone="UTC"
        onBook={onBook}
        variant="modal"
      />,
    );
    expect(screen.getByText('Not taking bookings')).toBeInTheDocument();
  });
});
