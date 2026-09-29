import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fullProfile, reviews } from '@/components/organisms/ProfileHeader/profile.fixture';
import { similarMentors } from '@/components/organisms/SimilarMentorsCard/similar.fixture';
import type { MentorReviewsResult } from '@/lib/api/data/reviews';
import type {
  MentorProfile,
  MyReview,
  Remote,
  ReviewableSession,
  ReviewPrompt,
  Viewer,
} from '@/types/mentor';
import { MentorProfileScreen, suggestionsLine } from './MentorProfileScreen';

const replace = vi.fn();
let search = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/mentors/gbenga',
  useSearchParams: () => search,
}));

let isGuest = false;
let viewerIsMentor = false;
let viewerLoading = false;
vi.mock('@/app/_shell/useAppShell', () => ({
  useAppShell: () => {
    if (viewerLoading)
      return {
        viewer: { kind: 'loading', signedIn: true },
        member: null,
        chrome: 'loading',
        account: undefined,
        canBook: true,
      };
    if (isGuest)
      return {
        viewer: { kind: 'guest' },
        member: null,
        chrome: 'guest',
        account: undefined,
        canBook: true,
      };
    // As in useAppShell: `member` is the viewer itself, when it's a member.
    const m = {
      kind: 'member',
      id: 'viewer-1',
      firstName: 'Ebun',
      initial: 'E',
      isMentee: !viewerIsMentor,
      isApprovedMentor: viewerIsMentor,
      isMentor: viewerIsMentor,
      completedSessions: 0,
      credits: null,
    } satisfies Extract<Viewer, { kind: 'member' }>;
    // canBookFor: mentors can't book.
    return { viewer: m, member: m, chrome: 'member', account: undefined, canBook: !viewerIsMentor };
  },
}));

// Per test: the Reviews tab's list and the review note.
let reviewsRemote: MentorReviewsResult;
let reviewPrompt: ReviewPrompt = null;
const reviewsArgs = vi.fn();
vi.mock('@/lib/api/data/reviews', () => ({
  REVIEW_PAGE_SIZE: 5,
  useMentorReviews: (...args: unknown[]) => {
    reviewsArgs(...args);
    return reviewsRemote;
  },
  // Like the real hook: nothing when the screen doesn't ask.
  useReviewPrompt: (_id: string | null, enabled: boolean) => (enabled ? reviewPrompt : null),
}));
// Per test: the viewer's own review, what they can review, and sending.
let myReviewRemote: Remote<MyReview | null>;
// The author's full review, with when it was fetched (the screen insists on a
// copy fetched after Edit opened).
let authoredRemote: Remote<MyReview> & { fetchedAt: number; failedAt: number };
let reviewableRemote: Remote<ReviewableSession[]>;
const sendReview = vi.fn();
let sendState: { isPending: boolean; result: MyReview | null; error: { message: string } | null };
vi.mock('@/lib/api/data/reviewWrite', () => ({
  useMyReview: () => myReviewRemote,
  useAuthoredReview: () => authoredRemote,
  useReviewableSessions: () => reviewableRemote,
  useSendReview: () => ({ send: sendReview, reset: vi.fn(), ...sendState }),
}));
const remote = <T,>(data: T): Remote<T> => ({
  data,
  isLoading: false,
  error: null,
  retry: vi.fn(),
});

// Per test: the Similar mentors card's list, and whether it was asked for.
let similarRemote: Remote<typeof similarMentors>;
const similarArgs = vi.fn();
vi.mock('@/lib/api/data/similar', () => ({
  useSimilarMentors: (...args: unknown[]) => {
    similarArgs(...args);
    return similarRemote;
  },
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
const coverSave = vi.fn();
const coverUpload = vi.fn();
vi.mock('@/lib/api/data/cover', () => ({
  BANNER_ACCEPT: 'image/jpeg,image/png,image/webp',
  useCoverEdit: () => ({
    save: coverSave,
    saveState: 'idle',
    savedStamp: 0,
    upload: coverUpload,
    uploading: false,
    uploadError: null,
    clearMessages: vi.fn(),
  }),
}));

const idle = { data: null, isLoading: false, error: null, retry: vi.fn() };
// Per test: what the booking modal's queries return.
let sessionTypesRemote: unknown = idle;
let slotsRemote: unknown = idle;
const sessionTypesArgs = vi.fn();
vi.mock('@/lib/api/data/booking', () => ({
  useSessionTypes: (...a: unknown[]) => {
    sessionTypesArgs(...a);
    return sessionTypesRemote;
  },
  useSlots: () => slotsRemote,
  useUploadIntakeFile: () => vi.fn(),
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
  viewerIsMentor = false;
  viewerLoading = false;
  reviewsRemote = reviewsState();
  reviewPrompt = null;
  reviewsArgs.mockReset();
  similarRemote = { data: similarMentors, isLoading: false, error: null, retry: vi.fn() };
  similarArgs.mockReset();
  myReviewRemote = remote(null);
  authoredRemote = {
    ...remote<MyReview>(null as unknown as MyReview),
    data: null,
    fetchedAt: 0,
    failedAt: 0,
  };
  reviewableRemote = remote([]);
  sendReview.mockReset();
  sendState = { isPending: false, result: null, error: null };
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

  it('not found with nobody to suggest sends people back to Explore', () => {
    profile = state({ notFound: true });
    similarRemote = { data: [], isLoading: false, error: null, retry: vi.fn() };
    render(<MentorProfileScreen handle="nobody" />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'This mentor profile isn’t available' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore mentors' })).toHaveAttribute(
      'href',
      '/explore',
    );
    expect(screen.queryByRole('heading', { name: 'Mentors with similar expertise' })).toBeNull();
  });

  it('not found, and the suggestions failed: the same way back, no section', () => {
    profile = state({ notFound: true });
    similarRemote = {
      data: null,
      isLoading: false,
      error: { kind: 'server', message: 'x' },
      retry: vi.fn(),
    };
    render(<MentorProfileScreen handle="nobody" />);
    expect(screen.getByRole('link', { name: 'Explore mentors' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Mentors with similar expertise' })).toBeNull();
  });

  it('not found suggests mentors with similar expertise (#38)', () => {
    profile = state({ notFound: true });
    render(<MentorProfileScreen handle="hidden-mentor" />);
    expect(similarArgs).toHaveBeenLastCalledWith('hidden-mentor', true);
    // The page's title; the section and its cards sit under it (review of #69).
    expect(
      screen.getByRole('heading', { level: 1, name: 'This mentor profile isn’t available' }),
    ).toBeInTheDocument();
    const section = screen.getByRole('region', { name: 'Mentors with similar expertise' });
    expect(section).toHaveTextContent(
      'They help with statement of purpose, scholarships & funding, and visa and interview, and are taking bookings.',
    );
    expect(within(section).getAllByRole('article')).toHaveLength(similarMentors.length);
    expect(within(section).getByRole('link', { name: 'Explore all mentors' })).toHaveAttribute(
      'href',
      '/explore',
    );
    // The big button gives way to the section's.
    expect(screen.queryByRole('link', { name: 'Explore mentors' })).toBeNull();
  });

  it('while the suggestions load, their place is held', () => {
    profile = state({ notFound: true });
    similarRemote = { data: null, isLoading: true, error: null, retry: vi.fn() };
    render(<MentorProfileScreen handle="hidden-mentor" />);
    const section = screen.getByRole('region', { name: 'Mentors with similar expertise' });
    expect(section).toHaveAttribute('aria-busy', 'true');
    expect(within(section).queryAllByRole('article')).toHaveLength(0);
  });

  it('a suggested mentor books in the same booking modal, for that mentor (review of #69)', async () => {
    const user = userEvent.setup();
    profile = state({ notFound: true });
    render(<MentorProfileScreen handle="hidden-mentor" />);
    await user.click(screen.getByRole('button', { name: 'Book session with Oluwakemi' }));
    const dialog = screen.getByRole('dialog');
    expect(sessionTypesArgs).toHaveBeenLastCalledWith('s1');
    expect(dialog).toHaveTextContent('Oluwakemi Olayinka');
    // Another mentor's page is worth a link (the profile's own mentor gets none).
    expect(within(dialog).getByRole('link', { name: /View profile/ })).toHaveAttribute(
      'href',
      '/mentors/oluwakemi-olayinka',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(sessionTypesArgs).toHaveBeenLastCalledWith(null);
    // Another suggestion: the booking follows.
    await user.click(screen.getByRole('button', { name: 'See availability' }));
    expect(sessionTypesArgs).toHaveBeenLastCalledWith('s2');
    expect(screen.getByRole('dialog')).toHaveTextContent('Muhammad Kabir Musa');
  });

  it('a suggested booking closes, and stops fetching, if the viewer turns out to be a mentor', async () => {
    const user = userEvent.setup();
    profile = state({ notFound: true });
    const { rerender } = render(<MentorProfileScreen handle="hidden-mentor" />);
    await user.click(screen.getByRole('button', { name: 'Book session with Oluwakemi' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    viewerIsMentor = true;
    rerender(<MentorProfileScreen handle="hidden-mentor" />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(sessionTypesArgs).toHaveBeenLastCalledWith(null);
  });

  it('a found profile asks for no suggestions when a mentor is looking', () => {
    viewerIsMentor = true;
    profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(similarArgs).toHaveBeenLastCalledWith('gbenga', false);
  });

  it('a mentor looking sees the suggestions with View profile, not Book', () => {
    viewerIsMentor = true;
    profile = state({ notFound: true });
    render(<MentorProfileScreen handle="hidden-mentor" />);
    const section = screen.getByRole('region', { name: 'Mentors with similar expertise' });
    expect(within(section).queryByRole('button', { name: /^Book/ })).toBeNull();
    expect(within(section).getAllByRole('link', { name: /^View profile/ })).toHaveLength(
      similarMentors.length,
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

  it('changes their cover: colour, topic icons and an image', async () => {
    profile = state({ data: { ...fullProfile, owner: { approval: 'approved', listed: true } } });
    const user = userEvent.setup();
    const { container } = render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Change cover' }));
    await user.click(screen.getByRole('radio', { name: 'Peach' }));
    expect(coverSave).toHaveBeenLastCalledWith({ color: 'peach' });
    await user.click(screen.getByRole('switch', { name: 'Show my topics on the cover' }));
    expect(coverSave).toHaveBeenLastCalledWith({ art: 'icons' });
    // The data layer checks the file (tested there); the page hands it over.
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    const ok = new File(['x'], 'a.png', { type: 'image/png' });
    await user.upload(input, ok);
    expect(coverUpload).toHaveBeenCalledWith(ok);
  });

  it('a visitor gets no cover tools', () => {
    profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('button', { name: 'Change cover' })).not.toBeInTheDocument();
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
      expect.objectContaining({ active: false }),
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
  });

  it('"Show N more" names what one click loads: at most a page', () => {
    search = new URLSearchParams('tab=reviews');
    profile = state({ data: { ...fullProfile, reviews: { ...fullProfile.reviews, count: 20 } } });
    reviewsRemote = reviewsState({ reviews, hasMore: true });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('button', { name: 'Show 5 more reviews' })).toBeInTheDocument();
    expect(screen.queryByText('Track record')).not.toBeInTheDocument();
    expect(reviewsArgs).toHaveBeenLastCalledWith(
      'gbenga',
      null,
      expect.objectContaining({ guest: false, active: true, ready: true }),
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

describe('MentorProfileScreen — Similar mentors', () => {
  it('shows the card at the bottom of the Overview aside', () => {
    profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    const aside = screen.getByRole('complementary');
    expect(within(aside).getByRole('heading', { name: 'Similar mentors' })).toBeInTheDocument();
    expect(similarArgs).toHaveBeenLastCalledWith('gbenga', true);
  });

  it('not on the Reviews tab (the design’s focus layout)', () => {
    search = new URLSearchParams('tab=reviews');
    profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('heading', { name: 'Similar mentors' })).not.toBeInTheDocument();
    expect(similarArgs).toHaveBeenLastCalledWith('gbenga', false);
  });

  it('never to the mentor on their own page', () => {
    profile = state({ data: { ...fullProfile, owner: { approval: 'approved', listed: true } } });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('heading', { name: 'Similar mentors' })).not.toBeInTheDocument();
    expect(similarArgs).toHaveBeenLastCalledWith('gbenga', false);
  });

  it('not for another mentor (product 2026-09-28: mentee-facing, no Explore for mentors)', () => {
    viewerIsMentor = true;
    profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('heading', { name: 'Similar mentors' })).not.toBeInTheDocument();
    expect(similarArgs).toHaveBeenLastCalledWith('gbenga', false);
  });

  it('waits while it isn’t known who is looking (review of #31)', () => {
    viewerLoading = true;
    profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('heading', { name: 'Similar mentors' })).not.toBeInTheDocument();
    expect(similarArgs).toHaveBeenLastCalledWith('gbenga', false);
  });

  it('names the aside after what it holds (review of #31)', () => {
    profile = state({ data: fullProfile });
    const { unmount } = render(<MentorProfileScreen handle="gbenga" />);
    expect(
      screen.getByRole('complementary', { name: 'Booking, track record and similar mentors' }),
    ).toBeInTheDocument();
    unmount();
    // Another mentor: no booking (mentors can't book), no similar mentors.
    viewerIsMentor = true;
    const second = render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('complementary', { name: 'Track record' })).toBeInTheDocument();
    second.unmount();
    viewerIsMentor = false;
    // The owner: no booking card, no similar mentors.
    profile = state({ data: { ...fullProfile, owner: { approval: 'approved', listed: true } } });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('complementary', { name: 'Track record' })).toBeInTheDocument();
  });

  it('the owner’s Reviews tab with nothing for the aside has no aside (review r3 of #31)', () => {
    search = new URLSearchParams('tab=reviews');
    profile = state({ data: { ...fullProfile, owner: { approval: 'approved', listed: true } } });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('hides the card when the list fails, and the aside stops naming it', () => {
    profile = state({ data: fullProfile });
    similarRemote = {
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
    viewerIsMentor = true;
    profile = state({
      data: { ...fullProfile, mentor: { ...fullProfile.mentor, completedSessions: 1 } },
    });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('button', { name: /^Book/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Book a session' })).not.toBeInTheDocument();
    // The rest of the profile is still there.
    expect(screen.getByRole('heading', { level: 1, name: 'Gbenga Elufisan' })).toBeInTheDocument();
  });

  it('no Book on the Sessions tab', () => {
    viewerIsMentor = true;
    search = new URLSearchParams('tab=sessions');
    profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('tab', { name: 'Sessions (1)' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.queryByRole('button', { name: /^Book/ })).not.toBeInTheDocument();
  });

  it('no mentee invitation card and no "review after your first session" (review of #54)', () => {
    viewerIsMentor = true;
    reviewPrompt = 'none';
    profile = state({
      data: { ...fullProfile, mentor: { ...fullProfile.mentor, completedSessions: 1 } },
    });
    const { unmount } = render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByText(/first mentees/)).not.toBeInTheDocument();
    unmount();
    search = new URLSearchParams('tab=reviews');
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByText(/after your first session/)).not.toBeInTheDocument();
  });

  it('an open booking closes if the viewer turns out to be a mentor (review of #54)', async () => {
    const user = userEvent.setup();
    profile = state({ data: fullProfile });
    const { rerender } = render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getAllByRole('button', { name: 'Book a session' })[0]!);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    viewerIsMentor = true;
    rerender(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('a mentee still gets the header Book and the booking card', () => {
    profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('button', { name: 'Book a session' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: fullProfile.sessionTypes[0]!.name }),
    ).toBeInTheDocument();
  });
});

describe('MentorProfileScreen — writing a review', () => {
  const due = () => {
    search = new URLSearchParams('tab=reviews');
    profile = state({ data: fullProfile });
    reviewPrompt = 'due';
    reviewableRemote = remote([
      { id: 's1', startsAt: '2026-09-19T15:00:00Z', typeName: 'SOP draft review' },
    ]);
  };

  it(
    '"Write a review" opens the flow; it sends once, with the session',
    { timeout: 15_000 },
    async () => {
      const user = userEvent.setup();
      due();
      render(<MentorProfileScreen handle="gbenga" />);
      await user.click(screen.getByRole('button', { name: 'Write a review' }));
      const dialog = screen.getByRole('dialog', { name: 'How was your session with Gbenga?' });
      expect(within(dialog).getByText('Pick a rating to continue.')).toBeInTheDocument();
      await user.click(within(dialog).getByRole('radio', { name: '5 stars, Excellent' }));
      await user.click(within(dialog).getByRole('textbox'));
      await user.paste('We rewrote my SOP opening together and it finally reads well.');
      await user.click(within(dialog).getByRole('button', { name: 'Continue' }));
      for (const q of [
        'How clearly did Gbenga communicate ideas and advice?',
        'How knowledgeable was Gbenga on the topics you discussed?',
        'How supported did you feel during the session?',
        'How practical were the suggestions you received?',
      ]) {
        await user.click(
          within(screen.getByRole('radiogroup', { name: q })).getByRole('radio', { name: 'Great' }),
        );
      }
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await user.click(
        within(
          screen.getByRole('radiogroup', {
            name: 'How much did this session move you toward your study abroad goals?',
          }),
        ).getByRole('radio', {
          name: '5',
        }),
      );
      await user.click(
        within(
          screen.getByRole('radiogroup', {
            name: 'How likely are you to recommend Gbenga to a friend?',
          }),
        ).getByRole('radio', {
          name: '10',
        }),
      );
      await user.dblClick(screen.getByRole('button', { name: 'Submit review' }));
      expect(sendReview).toHaveBeenCalledTimes(1);
      expect(sendReview.mock.calls[0]![0]).toMatchObject({
        mode: 'new',
        mentorId: 'm1',
        sessionId: 's1',
        answers: { overall: 5, communication: 'great', value: 5, recommend: 10 },
      });
    },
  );

  it('no "Write a review" when there is no session left to review', () => {
    due();
    reviewableRemote = remote([]);
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText('How was your session with Gbenga?')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Write a review' })).not.toBeInTheDocument();
  });

  it(
    'after submitting: "Thanks, your review is live", and the review can be edited',
    { timeout: 15_000 },
    async () => {
      const user = userEvent.setup();
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-09-29T12:00:00Z'));
      search = new URLSearchParams('tab=reviews');
      profile = state({ data: fullProfile });
      myReviewRemote = remote({
        id: 'r7',
        createdAt: '2026-09-29T11:55:00Z',
        editableUntil: '2026-09-29T12:05:00Z',
        answers: { overall: 4, text: 'Practical, direct feedback on my SOP draft.' },
      });
      reviewsRemote = reviewsState({ reviews });
      render(<MentorProfileScreen handle="gbenga" />);
      expect(screen.getByText('Thanks, your review is live')).toBeInTheDocument();
      // The list marks the viewer's own review (r7) as editable.
      expect(screen.getByText(/^Editable until/)).toBeInTheDocument();
      expect(screen.getByText('Your review')).toBeInTheDocument();
      // A copy fetched after Edit opens (the screen won't start from an older one).
      authoredRemote = {
        ...remote(myReviewRemote.data!),
        fetchedAt: Number.MAX_SAFE_INTEGER,
        failedAt: 0,
      };
      await user.click(screen.getByRole('button', { name: 'Edit review' }));
      expect(screen.getByRole('dialog', { name: 'Edit your review' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: '4 stars, Great' })).toHaveAttribute(
        'aria-checked',
        'true',
      );
      vi.useRealTimers();
    },
  );

  it('the "no session yet" note\'s Book scrolls to the booking card (design change)', async () => {
    const user = userEvent.setup();
    search = new URLSearchParams('tab=reviews');
    profile = state({ data: fullProfile });
    reviewPrompt = 'none';
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    render(<MentorProfileScreen handle="gbenga" />);
    const note = screen
      .getByText('You can review Gbenga after your first session')
      .closest('div')!.parentElement!;
    await user.click(within(note).getByRole('button', { name: 'Book a session' }));
    expect(scroll).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('MentorProfileScreen — editing a review (review of #59)', () => {
  const T0 = new Date('2026-09-29T12:00:00Z');
  const open = (over: Partial<MyReview['answers']> = {}): MyReview => ({
    id: 'r7',
    createdAt: '2026-09-29T11:58:00Z',
    editableUntil: '2026-09-29T12:08:00Z',
    answers: { overall: 4, text: 'Practical, direct feedback on my SOP draft.', ...over },
  });
  const full = (overall: number): MyReview => ({
    ...open(),
    answers: {
      overall,
      text: 'Practical, direct feedback on my SOP draft.',
      communication: 'great',
      knowledge: 'great',
      support: 'okay',
      practicality: 'great',
      value: 4,
      recommend: 9,
      platformNote: '',
    },
  });
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
    search = new URLSearchParams('tab=reviews');
    profile = state({ data: fullProfile });
  });
  afterEach(() => vi.useRealTimers());

  it('never starts the form from a stale cached copy; the fresh one seeds it and is what saving compares to', async () => {
    const user = userEvent.setup();
    myReviewRemote = remote(open());
    // A cached copy from before the last save (4 stars), fetched before Edit opened.
    authoredRemote = { ...remote(full(4)), fetchedAt: T0.getTime() - 60_000, failedAt: 0 };
    const { rerender } = render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Edit review' }));
    expect(screen.getByText('Loading your review')).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: /rate your time/ })).not.toBeInTheDocument();
    // The fresh copy lands: 2 stars (the last save).
    authoredRemote = { ...remote(full(2)), fetchedAt: T0.getTime() + 1, failedAt: 0 };
    rerender(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('radio', { name: '2 stars, Fair' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(sendReview.mock.calls[0]![0]).toMatchObject({
      mode: 'edit',
      before: { overall: 2 },
      answers: { overall: 2 },
    });
  });

  it('a failed load says so and retries', async () => {
    const user = userEvent.setup();
    myReviewRemote = remote(open());
    const retry = vi.fn();
    authoredRemote = {
      ...remote<MyReview>(null as unknown as MyReview),
      data: null,
      error: { kind: 'server', message: 'x' },
      retry,
      fetchedAt: 0,
      failedAt: 0,
    };
    const { rerender } = render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Edit review' }));
    authoredRemote = { ...authoredRemote, failedAt: T0.getTime() + 1 };
    rerender(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t load your review');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('the "live" note and Edit go away on their own at the deadline', () => {
    // Fake the timer too: the page re-renders at the deadline.
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(T0);
    myReviewRemote = remote(open());
    reviewsRemote = reviewsState({ reviews });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText('Thanks, your review is live')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(8 * 60_000 + 100);
    });
    expect(screen.queryByText('Thanks, your review is live')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Edit/ })).not.toBeInTheDocument();
  });

  it('once the window has shut, no "live" note and no Edit, whatever was fetched', () => {
    vi.setSystemTime(new Date('2026-09-29T12:09:00Z'));
    myReviewRemote = remote(open());
    reviewsRemote = reviewsState({ reviews });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByText('Thanks, your review is live')).not.toBeInTheDocument();
    expect(screen.queryByText(/^Editable until/)).not.toBeInTheDocument();
    expect(screen.getByText('Your review')).toBeInTheDocument();
  });
});

describe('suggestionsLine', () => {
  const at = (n: number) => similarMentors.slice(0, n);
  it('names up to three shared topics, commas keeping each whole', () => {
    expect(suggestionsLine(at(0))).toBe('They are taking bookings.');
    expect(suggestionsLine(at(1))).toBe(
      'They help with statement of purpose, and are taking bookings.',
    );
    expect(suggestionsLine(at(2))).toBe(
      'They help with statement of purpose, and scholarships & funding, and are taking bookings.',
    );
    expect(suggestionsLine(at(3))).toBe(
      'They help with statement of purpose, scholarships & funding, and visa and interview, and are taking bookings.',
    );
  });
  it('says a shared topic once', () => {
    const twice = [
      similarMentors[0]!,
      { ...similarMentors[1]!, sharedTopic: 'Statement of purpose' },
    ];
    expect(suggestionsLine(twice)).toBe(
      'They help with statement of purpose, and are taking bookings.',
    );
  });
});
