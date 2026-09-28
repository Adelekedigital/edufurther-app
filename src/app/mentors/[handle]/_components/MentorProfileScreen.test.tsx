import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fullProfile, reviews } from '@/components/organisms/ProfileHeader/profile.fixture';
import type { MentorReviewsResult } from '@/lib/api/data/reviews';
import type { MentorProfile, Remote, ReviewPrompt } from '@/types/mentor';
import { MentorProfileScreen } from './MentorProfileScreen';

const replace = vi.fn();
let search = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/mentors/gbenga',
  useSearchParams: () => search,
}));

let isGuest = false;
vi.mock('@/app/_shell/useAppShell', () => ({
  useAppShell: () =>
    isGuest
      ? { viewer: { kind: 'guest' }, member: null, chrome: 'guest', account: undefined }
      : {
          viewer: { kind: 'member', id: 'viewer-1' },
          member: { id: 'viewer-1', initial: 'E' },
          chrome: 'member',
          account: undefined,
        },
}));

// Per test: the Reviews tab's list and the review note.
let reviewsRemote: MentorReviewsResult;
let reviewPrompt: ReviewPrompt = null;
const reviewsArgs = vi.fn();
vi.mock('@/lib/api/data/reviews', () => ({
  useMentorReviews: (...args: unknown[]) => {
    reviewsArgs(...args);
    return reviewsRemote;
  },
  useReviewPrompt: () => reviewPrompt,
}));
const reviewsState = (over: Partial<MentorReviewsResult> = {}): MentorReviewsResult => ({
  reviews: [],
  isLoading: false,
  error: null,
  retry: vi.fn(),
  hasMore: false,
  isLoadingMore: false,
  loadMoreError: null,
  loadMore: vi.fn(),
  ...over,
});

type ProfileRemote = Remote<MentorProfile> & { notFound: boolean };
let profile: ProfileRemote;
vi.mock('@/lib/api/data/profile', () => ({ useMentorProfile: () => profile }));

const idle = { data: null, isLoading: false, error: null, retry: vi.fn() };
// Per test: what the booking modal's queries return.
let sessionTypesRemote: unknown = idle;
let slotsRemote: unknown = idle;
vi.mock('@/lib/api/data/booking', () => ({
  useSessionTypes: () => sessionTypesRemote,
  useSlots: () => slotsRemote,
  useRequestBooking: () => ({
    request: vi.fn(),
    isPending: false,
    isDone: false,
    error: null,
    reset: vi.fn(),
  }),
}));

const state = (over: Partial<ProfileRemote>): ProfileRemote => ({
  data: null,
  isLoading: false,
  error: null,
  notFound: false,
  retry: vi.fn(),
  ...over,
});

beforeEach(() => {
  search = new URLSearchParams();
  isGuest = false;
  reviewsRemote = reviewsState();
  reviewPrompt = null;
  reviewsArgs.mockReset();
  sessionTypesRemote = idle;
  slotsRemote = idle;
  replace.mockReset();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

describe('MentorProfileScreen — the four states', () => {
  it('loading', () => {
    profile = state({ isLoading: true });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading profile');
  });

  it('error, with a retry', async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    profile = state({ error: { kind: 'server', message: 'x' }, retry });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText('We couldn’t load this profile')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('not found (or not public) sends people back to Explore', () => {
    profile = state({ notFound: true });
    render(<MentorProfileScreen handle="nobody" />);
    expect(screen.getByText('This mentor profile isn’t available')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore mentors' })).toHaveAttribute(
      'href',
      '/explore',
    );
  });

  it('content: header, Book, and the tab in the URL', async () => {
    const user = userEvent.setup();
    profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Gbenga Elufisan' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Book a session' }).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('tab', { name: 'Sessions (1)' }));
    expect(replace).toHaveBeenCalledWith('/mentors/gbenga?tab=sessions', { scroll: false });
  });

  it('keeps a shared link’s other parameters when the tab changes (review of #21)', async () => {
    const user = userEvent.setup();
    search = new URLSearchParams('utm_source=linkedin');
    profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('tab', { name: 'Sessions (1)' }));
    expect(replace).toHaveBeenCalledWith('/mentors/gbenga?utm_source=linkedin&tab=sessions', {
      scroll: false,
    });
  });

  it('opens on the Sessions tab from ?tab=sessions', () => {
    search = new URLSearchParams('tab=sessions');
    profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('tab', { name: 'Sessions (1)' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Book session' })).toBeInTheDocument();
  });
});

describe('MentorProfileScreen — the mentor on their own page', () => {
  it('shows the owner bar and no way to book themselves', () => {
    profile = state({
      data: { ...fullProfile, owner: { approval: 'pending', listed: true } },
    });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(
      screen.getByText('Only you can see this until your profile is approved.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Book a session' })).not.toBeInTheDocument();
  });

  it('tells a declined mentor their profile wasn’t approved (review of #21)', () => {
    profile = state({ data: { ...fullProfile, owner: { approval: 'declined', listed: true } } });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(
      screen.getByText('Your profile wasn’t approved. Only you can see it.'),
    ).toBeInTheDocument();
  });

  it('says an unlisted profile is hidden', () => {
    profile = state({ data: { ...fullProfile, owner: { approval: 'approved', listed: false } } });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText('Your profile is unlisted. Only you can see it.')).toBeInTheDocument();
  });

  it('keeps a loaded profile on screen when a background refetch fails (review of #21)', () => {
    profile = state({ data: fullProfile, error: { kind: 'offline', message: 'x' } });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Gbenga Elufisan' })).toBeInTheDocument();
    expect(screen.queryByText('We couldn’t load this profile')).not.toBeInTheDocument();
  });

  it('knows the owner by id even before the owner-only fields arrive', () => {
    profile = state({
      data: { ...fullProfile, mentor: { ...fullProfile.mentor, id: 'viewer-1' } },
    });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText(/You’re viewing your own profile./)).toBeInTheDocument();
  });
});

describe('MentorProfileScreen — new mentors (design reply #45)', () => {
  const newMentor = (sessions: number, over: Partial<MentorProfile> = {}): MentorProfile => ({
    ...fullProfile,
    mentor: {
      ...fullProfile.mentor,
      completedSessions: sessions,
      reviewCount: 0,
      rating: null,
      nextAvailableState: 'open',
      nextAvailableAt: '2026-09-28T13:00:00Z',
    },
    ...over,
  });

  it('invites mentees under 3 sessions, with the move and the award, and not from 3', () => {
    profile = state({ data: newMentor(2) });
    const { unmount } = render(<MentorProfileScreen handle="gbenga" />);
    expect(
      screen.getByRole('heading', { name: 'Be one of Gbenga’s first mentees' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Made the move you’re planning.')).toBeInTheDocument();
    expect(screen.getByText('Got funded.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Book .* · / })).toBeInTheDocument();
    unmount();
    profile = state({ data: newMentor(3) });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByText(/first mentees/)).not.toBeInTheDocument();
  });

  it('"Book {time}" opens the booking modal with that time picked', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-27T12:00:00Z'));
    try {
      const user = userEvent.setup();
      sessionTypesRemote = {
        ...idle,
        data: [
          {
            id: 'st1',
            name: 'General mentorship',
            durationMin: 60,
            description: '',
            questions: [],
          },
        ],
      };
      slotsRemote = { ...idle, data: ['2026-09-28T09:00:00Z', '2026-09-28T13:00:00Z'] };
      profile = state({ data: newMentor(0) });
      render(<MentorProfileScreen handle="gbenga" />);
      await user.click(screen.getByRole('button', { name: /^Book .* · / }));
      // The card's time (13:00Z) is picked, not the day's first (09:00Z):
      // the footer reads "Request {the card's time}".
      const cardTime = screen.getByRole('button', { name: /^Book .* · / }).textContent!.slice(5);
      expect(
        within(screen.getByRole('dialog')).getByRole('button', { name: `Request ${cardTime}` }),
      ).toBeEnabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('offers no Book when the mentor has no session types', () => {
    profile = state({ data: newMentor(0, { sessionTypes: [] }) });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText(/first mentees/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Book .* · / })).not.toBeInTheDocument();
  });

  it('shows the owner what mentees see, and "Share your profile" opens the share menu', async () => {
    const user = userEvent.setup();
    profile = state({ data: newMentor(1, { owner: { approval: 'approved', listed: true } }) });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(
      screen.getByRole('heading', { name: 'Mentees see you as a new mentor' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Share your profile' }));
    expect(screen.getByRole('menuitem', { name: 'Copy profile link' })).toHaveFocus();
  });

  it('does not nudge sharing a profile mentees can’t see (review of #25)', () => {
    for (const owner of [
      { approval: 'pending' as const, listed: true },
      { approval: 'declined' as const, listed: true },
      { approval: 'approved' as const, listed: false },
    ]) {
      profile = state({ data: newMentor(0, { owner }) });
      const { unmount } = render(<MentorProfileScreen handle="gbenga" />);
      expect(screen.queryByRole('button', { name: 'Share your profile' })).not.toBeInTheDocument();
      unmount();
    }
  });
});

describe('MentorProfileScreen — Reviews tab', () => {
  it('has a Reviews (N) tab, and the header rating opens it', async () => {
    const user = userEvent.setup();
    profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('tab', { name: 'Reviews (7)' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /4\.9\s*\(7 reviews\)/ }));
    expect(replace).toHaveBeenCalledWith('/mentors/gbenga?tab=reviews', { scroll: false });
    // Nothing fetched until the tab is open.
    expect(reviewsArgs).toHaveBeenLastCalledWith(
      'gbenga',
      null,
      expect.objectContaining({ enabled: false }),
    );
  });

  it('has no Reviews tab without reviews, and ?tab=reviews falls back to Overview', () => {
    search = new URLSearchParams('tab=reviews');
    profile = state({
      data: { ...fullProfile, reviews: { ...fullProfile.reviews, count: 0 } },
    });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('tab', { name: /Reviews/ })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  });

  it('shows the summary, the list and the aside without the track record', () => {
    search = new URLSearchParams('tab=reviews');
    profile = state({ data: fullProfile });
    reviewsRemote = reviewsState({ reviews, hasMore: true });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText('9 in 10')).toBeInTheDocument();
    expect(screen.getByText('mentees would recommend Gbenga to a friend')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(5);
    // 7 reviews, 5 shown.
    expect(screen.getByRole('button', { name: 'Show 2 more reviews' })).toBeInTheDocument();
    expect(screen.queryByText('Track record')).not.toBeInTheDocument();
    expect(reviewsArgs).toHaveBeenLastCalledWith(
      'gbenga',
      null,
      expect.objectContaining({ guest: false, enabled: true }),
    );
  });

  it('filters by session type', async () => {
    const user = userEvent.setup();
    search = new URLSearchParams('tab=reviews');
    profile = state({
      data: {
        ...fullProfile,
        sessionTypes: [
          fullProfile.sessionTypes[0]!,
          { ...fullProfile.sessionTypes[0]!, id: 'st9', name: 'Visa prep' },
        ],
      },
    });
    reviewsRemote = reviewsState({ reviews });
    render(<MentorProfileScreen handle="gbenga" />);
    const group = screen.getByRole('group', { name: 'Filter reviews by session' });
    expect(within(group).getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(within(group).getByRole('button', { name: 'Visa prep' }));
    expect(reviewsArgs).toHaveBeenLastCalledWith('gbenga', 'st9', expect.anything());
  });

  it('a guest sees one review without its text, then the sign-up card', () => {
    isGuest = true;
    search = new URLSearchParams('tab=reviews');
    profile = state({ data: fullProfile });
    reviewsRemote = reviewsState({ reviews: [{ ...reviews[0]!, text: '' }] });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(reviewsArgs).toHaveBeenLastCalledWith(
      'gbenga',
      null,
      expect.objectContaining({ guest: true }),
    );
    expect(
      screen.getByRole('img', { name: 'Review text hidden. Sign up to read it.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('+6 more reviews from mentees')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue with email' })).toHaveAttribute(
      'href',
      '/signup?next=%2Fmentors%2Fgbenga%3Ftab%3Dreviews',
    );
    const gate = screen.getByRole('heading', {
      name: 'See what mentees say about Gbenga',
    }).parentElement!;
    expect(within(gate).getByRole('link', { name: 'Log in' })).toHaveAttribute(
      'href',
      '/login?next=%2Fmentors%2Fgbenga%3Ftab%3Dreviews',
    );
  });

  it('a mentee with no session yet is told when they can review, with a Book button', () => {
    search = new URLSearchParams('tab=reviews');
    profile = state({ data: fullProfile });
    reviewPrompt = 'none';
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText('You can review Gbenga after your first session')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Book a session' }).length).toBeGreaterThan(1);
  });

  it('a mentee with a review due is asked, without a button yet', () => {
    search = new URLSearchParams('tab=reviews');
    profile = state({ data: fullProfile });
    reviewPrompt = 'due';
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText('How was your session with Gbenga?')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Write a review' })).not.toBeInTheDocument();
  });

  it('a failed list says so and retries (error before empty)', async () => {
    const user = userEvent.setup();
    search = new URLSearchParams('tab=reviews');
    profile = state({ data: fullProfile });
    const retry = vi.fn();
    reviewsRemote = reviewsState({ error: { kind: 'server', message: 'x' }, retry });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText('We couldn’t load reviews')).toBeInTheDocument();
    expect(screen.queryByText('No reviews for this session yet.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });
});
