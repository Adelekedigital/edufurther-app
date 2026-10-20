import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MetMentor } from '@/lib/api/data/metMentors';
import type { Remote } from '@/types/mentor';
import { MenteeMentorsSection } from './MenteeMentorsSection';

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
  ...over,
});

const render_ = (mentors: Remote<MetMentor[]>, onBook = vi.fn()) => {
  render(<MenteeMentorsSection mentors={mentors} timeZone="Africa/Lagos" onBook={onBook} />);
  return onBook;
};

beforeEach(() => {
  n = 0;
});

describe('MenteeMentorsSection', () => {
  it('a settled-empty list hides the section (nothing to re-book)', () => {
    const { container } = render(
      <MenteeMentorsSection mentors={remote<MetMentor[]>([])} timeZone="UTC" onBook={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('an error shows a retry, not an empty list', async () => {
    const mentors = remote<MetMentor[]>(null, { error: {} as never });
    render_(mentors);
    expect(screen.getByText(/couldn’t load your mentors/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(mentors.retry).toHaveBeenCalled();
  });

  it('shows up to three inline and no "See all" at three or fewer', () => {
    render_(remote([mentor(), mentor(), mentor()]));
    expect(screen.getByRole('heading', { name: 'Your mentors' })).toBeInTheDocument();
    expect(screen.getAllByText(/^Mentor \d$/)).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'See all mentors' })).not.toBeInTheDocument();
  });

  it('shows "See all" past three, and the modal lists everyone', async () => {
    render_(remote([mentor(), mentor(), mentor(), mentor()]));
    // The fourth isn't in the inline list of three.
    expect(screen.queryByText('Mentor 4')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'See all mentors' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Mentor 4')).toBeInTheDocument();
  });

  it('routes each bookability: Book again opens the flow; others go to Bookings; unavailable is a note', async () => {
    const onBook = render_(
      remote([
        mentor({ bookability: 'open', name: 'Open One' }),
        mentor({ bookability: 'has_upcoming', name: 'Upcoming One' }),
        mentor({ bookability: 'pending', name: 'Pending One' }),
      ]),
    );
    // open → Book again opens the flow; each CTA names its mentor so they're distinct.
    await userEvent.click(screen.getByRole('button', { name: 'Book again with Open One' }));
    expect(onBook).toHaveBeenCalledOnce();
    // has_upcoming / pending → View booking links to Bookings, each naming its mentor.
    expect(screen.getByRole('link', { name: 'View booking with Upcoming One' })).toHaveAttribute(
      'href',
      '/bookings',
    );
    expect(screen.getByRole('link', { name: 'View booking with Pending One' })).toHaveAttribute(
      'href',
      '/bookings?tab=pending',
    );
  });

  it('an unavailable mentor shows a note, not a button', () => {
    render_(remote([mentor({ bookability: 'unavailable' })]));
    expect(screen.getByText('Not taking bookings')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Book again/ })).not.toBeInTheDocument();
  });
});
