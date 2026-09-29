import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fullProfile, reviews } from '@/components/organisms/ProfileHeader/profile.fixture';
import { h, state, similarArgs } from './profileScreen.harness';
import { MentorProfileScreen } from './MentorProfileScreen';

// The data hooks, mocked (hoisted above the imports; state lives in the harness).
vi.mock('next/navigation', async () =>
  (await import('./profileScreen.harness')).mocks.navigation(),
);
vi.mock('@/app/_shell/useAppShell', async () =>
  (await import('./profileScreen.harness')).mocks.appShell(),
);
vi.mock('@/lib/api/data/reviews', async () =>
  (await import('./profileScreen.harness')).mocks.reviews(),
);
vi.mock('@/lib/api/data/reviewWrite', async () =>
  (await import('./profileScreen.harness')).mocks.reviewWrite(),
);
vi.mock('@/lib/api/data/similar', async () =>
  (await import('./profileScreen.harness')).mocks.similar(),
);
vi.mock('@/lib/api/data/profile', async () =>
  (await import('./profileScreen.harness')).mocks.profile(),
);
vi.mock('@/lib/api/data/cover', async () =>
  (await import('./profileScreen.harness')).mocks.cover(),
);
vi.mock('@/lib/api/data/profileEdit', async () =>
  (await import('./profileScreen.harness')).mocks.profileEdit(),
);
vi.mock('@/lib/api/data/booking', async () =>
  (await import('./profileScreen.harness')).mocks.booking(),
);

describe('MentorProfileScreen — Similar mentors', () => {
  it('shows the card at the bottom of the Overview aside', () => {
    h.profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    const aside = screen.getByRole('complementary');
    expect(within(aside).getByRole('heading', { name: 'Similar mentors' })).toBeInTheDocument();
    expect(similarArgs).toHaveBeenLastCalledWith('gbenga', true);
  });

  it('not on the Reviews tab (the design’s focus layout)', () => {
    h.search = new URLSearchParams('tab=reviews');
    h.profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('heading', { name: 'Similar mentors' })).not.toBeInTheDocument();
    expect(similarArgs).toHaveBeenLastCalledWith('gbenga', false);
  });

  it('never to the mentor on their own page', () => {
    h.profile = state({ data: { ...fullProfile, owner: { approval: 'approved', listed: true } } });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('heading', { name: 'Similar mentors' })).not.toBeInTheDocument();
    expect(similarArgs).toHaveBeenLastCalledWith('gbenga', false);
  });

  it('not for another mentor (product 2026-09-28: mentee-facing, no Explore for mentors)', () => {
    h.viewerIsMentor = true;
    h.profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('heading', { name: 'Similar mentors' })).not.toBeInTheDocument();
    expect(similarArgs).toHaveBeenLastCalledWith('gbenga', false);
  });

  it('waits while it isn’t known who is looking (review of #31)', () => {
    h.viewerLoading = true;
    h.profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('heading', { name: 'Similar mentors' })).not.toBeInTheDocument();
    expect(similarArgs).toHaveBeenLastCalledWith('gbenga', false);
  });

  it('names the aside after what it holds (review of #31)', () => {
    h.profile = state({ data: fullProfile });
    const { unmount } = render(<MentorProfileScreen handle="gbenga" />);
    expect(
      screen.getByRole('complementary', { name: 'Booking, track record and similar mentors' }),
    ).toBeInTheDocument();
    unmount();
    // Another mentor: no booking (mentors can't book), no similar mentors.
    h.viewerIsMentor = true;
    const second = render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('complementary', { name: 'Track record' })).toBeInTheDocument();
    second.unmount();
    h.viewerIsMentor = false;
    // The owner: no booking card, no similar mentors.
    h.profile = state({ data: { ...fullProfile, owner: { approval: 'approved', listed: true } } });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('complementary', { name: 'Track record' })).toBeInTheDocument();
  });

  it('the owner’s Reviews tab with nothing for the aside has no aside (review r3 of #31)', () => {
    h.search = new URLSearchParams('tab=reviews');
    h.profile = state({ data: { ...fullProfile, owner: { approval: 'approved', listed: true } } });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('hides the card when the list fails, and the aside stops naming it', () => {
    h.profile = state({ data: fullProfile });
    h.similarRemote = {
      data: null,
      isLoading: false,
      error: { kind: 'server', message: 'x' },
      retry: vi.fn(),
    };
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('heading', { name: 'Similar mentors' })).not.toBeInTheDocument();
    expect(
      screen.getByRole('complementary', { name: 'Booking and track record' }),
    ).toBeInTheDocument();
  });
});

describe('MentorProfileScreen — a mentor viewing another mentor (mentors can’t book)', () => {
  it('no Book controls: header, booking card, first-mentees card', () => {
    h.viewerIsMentor = true;
    h.profile = state({
      data: { ...fullProfile, mentor: { ...fullProfile.mentor, completedSessions: 1 } },
    });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('button', { name: /^Book/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Book a session' })).not.toBeInTheDocument();
    // The rest of the h.profile is still there.
    expect(screen.getByRole('heading', { level: 1, name: 'Gbenga Elufisan' })).toBeInTheDocument();
  });

  it('no Book on the Sessions tab', () => {
    h.viewerIsMentor = true;
    h.search = new URLSearchParams('tab=sessions');
    h.profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('tab', { name: 'Sessions (1)' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.queryByRole('button', { name: /^Book/ })).not.toBeInTheDocument();
  });

  it('no mentee invitation card and no "review after your first session" (review of #54)', () => {
    h.viewerIsMentor = true;
    h.reviewPrompt = 'none';
    h.profile = state({
      data: { ...fullProfile, mentor: { ...fullProfile.mentor, completedSessions: 1 } },
    });
    const { unmount } = render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByText(/first mentees/)).not.toBeInTheDocument();
    unmount();
    h.search = new URLSearchParams('tab=reviews');
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByText(/after your first session/)).not.toBeInTheDocument();
  });

  it('an open booking closes if the viewer turns out to be a mentor (review of #54)', async () => {
    const user = userEvent.setup();
    h.profile = state({ data: fullProfile });
    const { rerender } = render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getAllByRole('button', { name: 'Book a session' })[0]!);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    h.viewerIsMentor = true;
    rerender(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('a mentee still gets the header Book and the booking card', () => {
    h.profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('button', { name: 'Book a session' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: fullProfile.sessionTypes[0]!.name }),
    ).toBeInTheDocument();
  });
});
