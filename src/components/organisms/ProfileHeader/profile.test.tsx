import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookSessionCard } from '../BookSessionCard/BookSessionCard';
import { FirstMenteesCard } from '../FirstMenteesCard/FirstMenteesCard';
import { ProfileOverview } from '../ProfileOverview/ProfileOverview';
import { TrackRecordCard } from '../TrackRecordCard/TrackRecordCard';
import { coverFor } from '@/lib/utils/cover';
import { ProfileHeader, locationLine } from './ProfileHeader';
import { fullProfile, newProfile, sessionTypes } from './profile.fixture';

describe('ProfileHeader', () => {
  it('shows the rating only with reviews (product rule)', () => {
    const { rerender } = render(<ProfileHeader profile={fullProfile} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Gbenga Elufisan' })).toBeInTheDocument();
    expect(screen.getByText('4.9')).toBeInTheDocument();
    expect(screen.getByText(/From Nigeria, studied in United States/)).toBeInTheDocument();
    rerender(<ProfileHeader profile={newProfile} />);
    expect(screen.queryByText('4.9')).not.toBeInTheDocument();
    // Design reply #45: no "New to EduFurther" on the profile; the sessions
    // count leads (the first-mentees card says "New mentor").
    expect(screen.queryByText('New to EduFurther')).not.toBeInTheDocument();
    expect(screen.getByText('No sessions yet')).toBeInTheDocument();
  });

  it('puts the topics before the buttons, so a stacked header reads name → topics → actions', () => {
    render(
      <ProfileHeader
        profile={fullProfile}
        actions={<button type="button">Book a session</button>}
      />,
    );
    const topics = screen.getByRole('list', { name: 'Helps with' });
    const book = screen.getByRole('button', { name: 'Book a session' });
    expect(topics.compareDocumentPosition(book) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders no topic list when the mentor has none', () => {
    render(
      <ProfileHeader
        profile={{ ...fullProfile, mentor: { ...fullProfile.mentor, topics: [] } }}
        actions={<button type="button">Book a session</button>}
      />,
    );
    expect(screen.queryByRole('list', { name: 'Helps with' })).not.toBeInTheDocument();
  });

  it('paints the banner and the initials circle in the mentor’s cover colours', () => {
    const { container } = render(<ProfileHeader profile={fullProfile} />);
    const banner = container.querySelector('section')!.firstElementChild as HTMLElement;
    const key = coverFor(fullProfile.mentor.id);
    expect(banner.style.getPropertyValue('--cover-bg')).toBe(`var(--cover-${key}-bg)`);
    const circle = screen.getByRole('img', { name: fullProfile.mentor.name }).parentElement!;
    expect(circle.style.getPropertyValue('--photo-bg')).toBe(`var(--cover-${key}-ink)`);
  });

  it('uses the mentor’s chosen cover colour over the automatic one', () => {
    const { container } = render(
      <ProfileHeader profile={{ ...fullProfile, cover: { color: 'rose', art: 'none' } }} />,
    );
    const banner = container.querySelector('section')!.firstElementChild as HTMLElement;
    expect(banner.style.getPropertyValue('--cover-bg')).toBe('var(--cover-rose-bg)');
  });

  it('draws the first 3 topics as faint icons, hidden from assistive tech', () => {
    const { container } = render(
      <ProfileHeader profile={{ ...fullProfile, cover: { color: null, art: 'icons' } }} />,
    );
    const banner = container.querySelector('section')!.firstElementChild as HTMLElement;
    const art = banner.querySelector('[aria-hidden]')!;
    expect(art.querySelectorAll('span')).toHaveLength(
      Math.min(3, fullProfile.mentor.topics.length),
    );
  });

  it('draws no art over a banner image', () => {
    const { container } = render(
      <ProfileHeader
        profile={{ ...fullProfile, bannerUrl: '/b.jpg', cover: { color: null, art: 'icons' } }}
      />,
    );
    const banner = container.querySelector('section')!.firstElementChild as HTMLElement;
    expect(banner.querySelector('[aria-hidden]')).toBeNull();
    expect(banner.querySelector('img')).toHaveAttribute('src', '/b.jpg');
  });

  it('a status sits where Book would, as text with a hidden icon', () => {
    render(<ProfileHeader profile={fullProfile} status="Not taking bookings" />);
    const line = screen.getByText('Not taking bookings');
    expect(line.tagName).toBe('P');
    expect(line.querySelector('[aria-hidden="true"]')).toHaveTextContent('event_busy');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('puts the owner’s cover tools with the banner', () => {
    render(<ProfileHeader profile={fullProfile} bannerTools={<button>Change cover</button>} />);
    expect(screen.getByRole('button', { name: 'Change cover' })).toBeInTheDocument();
  });

  it('says whichever half of the move is known', () => {
    expect(locationLine('Ghana', null)).toBe('From Ghana');
    expect(locationLine(null, 'Canada')).toBe('Studied in Canada');
    expect(locationLine(null, null)).toBeNull();
  });
});

describe('ProfileOverview', () => {
  it('leaves out every section with nothing in it', () => {
    render(<ProfileOverview profile={newProfile} />);
    expect(screen.queryByRole('heading', { name: 'About' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Background' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Scholarships and awards' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Education' })).toBeInTheDocument();
  });

  it('names the move when origin and study country differ', () => {
    render(<ProfileOverview profile={fullProfile} />);
    expect(
      screen.getByText(/Has made the move from Nigeria to the United States/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /LinkedIn/ })).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/gbenga',
    );
  });
});

describe('TrackRecordCard', () => {
  it('says mentees come back only when they do', () => {
    const { rerender } = render(<TrackRecordCard profile={fullProfile} />);
    expect(screen.getByText('Mentees keep coming back')).toBeInTheDocument();
    expect(screen.getByText(/books 1.9 sessions with Gbenga/)).toBeInTheDocument();
    expect(screen.getByText('3,060 mins')).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();
    rerender(
      <TrackRecordCard profile={{ ...fullProfile, menteesMentored: 51, attendanceRate: null }} />,
    );
    expect(screen.queryByText('Mentees keep coming back')).not.toBeInTheDocument();
    // Unknown attendance keeps its tile: the grid stays whole, and it never says 0%.
    expect(screen.getByText('avg. attendance')).toBeInTheDocument();
    expect(screen.getByText('No data yet')).toBeInTheDocument();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('shows the rating whenever there are reviews, even without repeat bookings (review of #21)', () => {
    render(<TrackRecordCard profile={{ ...fullProfile, menteesMentored: 51 }} />);
    expect(screen.getByRole('img', { name: 'Rated 4.9 out of 5' })).toBeInTheDocument();
    expect(screen.queryByText('Mentees keep coming back')).not.toBeInTheDocument();
  });

  it('renders nothing before the first session (the page shows FirstMenteesCard)', () => {
    const { container } = render(<TrackRecordCard profile={newProfile} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the stats from 1 session and the rating band only from 3', () => {
    const two = {
      ...fullProfile,
      mentor: { ...fullProfile.mentor, completedSessions: 2, reviewCount: 1, rating: 5 },
      menteesMentored: 1,
    };
    const { rerender } = render(<TrackRecordCard profile={two} />);
    expect(screen.getByText('sessions completed')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Rated/ })).not.toBeInTheDocument();
    rerender(
      <TrackRecordCard profile={{ ...two, mentor: { ...two.mentor, completedSessions: 3 } }} />,
    );
    expect(screen.getByRole('img', { name: 'Rated 5.0 out of 5' })).toBeInTheDocument();
  });
});

describe('FirstMenteesCard', () => {
  it('invites mentees with the move and the award, and books the next time', async () => {
    const user = userEvent.setup();
    const onBook = vi.fn();
    render(
      <FirstMenteesCard
        variant="mentee"
        firstName="Adaeze"
        nextTime="2026-09-28T13:00:00Z"
        timeZone="America/New_York"
        move={{ from: 'Nigeria', to: 'the United Kingdom' }}
        award="Commonwealth Scholarship"
        onBook={onBook}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Be one of Adaeze’s first mentees' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Made the move you’re planning.')).toBeInTheDocument();
    expect(
      screen.getByText(/From Nigeria to the United Kingdom, a path many mentees are planning\./),
    ).toBeInTheDocument();
    expect(screen.getByText('Got funded.')).toBeInTheDocument();
    expect(screen.getByText(/Commonwealth Scholarship\./)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Book Mon, Sep 28 · 9:00 am' }));
    expect(onBook).toHaveBeenCalledWith('2026-09-28T13:00:00Z');
  });

  it('leaves out the facts box and Book when there is nothing to show', () => {
    render(
      <FirstMenteesCard
        variant="mentee"
        firstName="Adaeze"
        nextTime={null}
        timeZone="UTC"
        move={null}
        award={null}
        onBook={vi.fn()}
      />,
    );
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('tells the owner what mentees see and offers sharing', async () => {
    const user = userEvent.setup();
    const onShare = vi.fn();
    render(<FirstMenteesCard variant="owner" onShare={onShare} />);
    expect(
      screen.getByRole('heading', { name: 'Mentees see you as a new mentor' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Share your profile' }));
    expect(onShare).toHaveBeenCalled();
  });
});

describe('BookSessionCard', () => {
  it('one offering: Book this session opens booking on it, and says what comes next', async () => {
    const user = userEvent.setup();
    const onBook = vi.fn();
    render(
      <BookSessionCard
        sessionTypes={[sessionTypes[0]!]}
        onBook={onBook}
        onCompare={vi.fn()}
        bookBlocked={null}
      />,
    );
    expect(screen.queryByText(/Next available/)).not.toBeInTheDocument();
    expect(
      screen.getByText('You’ll pick a time and answer a few questions next.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Book this session' }));
    expect(onBook).toHaveBeenCalledWith('st1');
  });

  it('shows why booking is blocked', () => {
    render(
      <BookSessionCard
        sessionTypes={[sessionTypes[0]!]}
        onBook={vi.fn()}
        onCompare={vi.fn()}
        bookBlocked="Booking needs a connection"
      />,
    );
    expect(screen.getByRole('button', { name: 'Booking needs a connection' })).toBeDisabled();
  });

  it('lists two offerings and sends the rest to the Sessions tab', async () => {
    const user = userEvent.setup();
    const onCompare = vi.fn();
    render(
      <BookSessionCard
        sessionTypes={sessionTypes}
        onBook={vi.fn()}
        onCompare={onCompare}
        bookBlocked={null}
      />,
    );
    const rowBooks = screen
      .getAllByRole('button')
      .filter((b) => /^Book (SOP|Mock|Program)/.test(b.textContent ?? ''));
    expect(rowBooks).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: /See all 3 sessions/ }));
    expect(onCompare).toHaveBeenCalled();
  });
});
