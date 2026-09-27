import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookSessionCard } from '../BookSessionCard/BookSessionCard';
import { ProfileOverview } from '../ProfileOverview/ProfileOverview';
import { TrackRecordCard } from '../TrackRecordCard/TrackRecordCard';
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
    expect(screen.getByText('New to EduFurther')).toBeInTheDocument();
    expect(screen.getByText('No sessions yet')).toBeInTheDocument();
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
    expect(screen.getByText(/Has made the move from Nigeria to United States/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /LinkedIn/ })).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/gbenga',
    );
  });
});

describe('TrackRecordCard', () => {
  it('says mentees come back only when they do', () => {
    const { rerender } = render(<TrackRecordCard profile={fullProfile} isOwner={false} />);
    expect(screen.getByText('Mentees keep coming back')).toBeInTheDocument();
    expect(screen.getByText(/books 1.9 sessions with Gbenga/)).toBeInTheDocument();
    expect(screen.getByText('3,060 mins')).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();
    rerender(
      <TrackRecordCard
        profile={{ ...fullProfile, menteesMentored: 51, attendanceRate: null }}
        isOwner={false}
      />,
    );
    expect(screen.queryByText('Mentees keep coming back')).not.toBeInTheDocument();
    expect(screen.queryByText('avg. attendance')).not.toBeInTheDocument();
  });

  it('shows the rating whenever there are reviews, even without repeat bookings (review of #21)', () => {
    render(<TrackRecordCard profile={{ ...fullProfile, menteesMentored: 51 }} isOwner={false} />);
    expect(screen.getByRole('img', { name: 'Rated 4.9 out of 5' })).toBeInTheDocument();
    expect(screen.queryByText('Mentees keep coming back')).not.toBeInTheDocument();
  });

  it('invites first mentees when there are no sessions yet', () => {
    render(<TrackRecordCard profile={newProfile} isOwner={false} />);
    expect(screen.getByText('Be one of Oluwakemi’s first mentees')).toBeInTheDocument();
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
