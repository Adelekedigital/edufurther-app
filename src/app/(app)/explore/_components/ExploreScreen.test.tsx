import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Mentor } from '@/types/mentor';
import { ExploreScreen } from './ExploreScreen';

// The booking modal's Finish setup navigates with the router.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

let canBook = true;
vi.mock('@/app/_shell/useAppShell', () => ({
  MATCH_CALL_URL: '',
  isMenteeSide: () => false,
  useAppShell: () => ({
    viewer: { kind: 'guest' },
    member: null,
    chrome: 'guest',
    account: undefined,
    nav: 'mentee',
    canBook,
  }),
}));

let inviter: { firstName: string; photoUrl: string | null } | null = null;
const lookupFor = vi.fn();
vi.mock('@/lib/api/data/invite', () => ({
  useInviteLookup: (code: string | null) => {
    lookupFor(code);
    return { data: code ? inviter : null, isLoading: false, error: null, retry: vi.fn() };
  },
}));

const mentor: Mentor = {
  id: 'm1',
  profileHref: '/mentors/m1',
  name: 'Olajuwon Samuel',
  firstName: 'Olajuwon',
  initials: 'OS',
  photoUrl: null,
  photoFocus: null,
  cover: 'sky',
  degreeLine: 'MSc, Computer Science',
  institution: 'University of London',
  completedSessions: 23,
  reviewCount: 11,
  rating: 4.9,
  label: 'top-rated',
  offer: 'free',
  nextAvailableAt: '2026-09-28T12:00:00Z',
  nextAvailableState: 'open',
  takingBookings: true,
  topics: [],
};
vi.mock('@/lib/api/data/mentors', () => ({
  useTopics: () => ({ topics: [], isLoading: false, error: null, retry: vi.fn() }),
  useFeaturedMentor: () => ({ featured: null, isLoading: false }),
  useMentors: () => ({
    mentors: [mentor],
    isLoading: false,
    isRefreshing: false,
    error: null,
    retry: vi.fn(),
    total: 1,
    restarted: false,
    dismissRestarted: vi.fn(),
    hasMore: false,
    isLoadingMore: false,
    loadMoreError: null,
    loadMore: vi.fn(),
  }),
}));
const remote = { data: [], isLoading: false, error: null, retry: vi.fn() };
// The guest step's sign-in has its own tests (useBookingSignIn.test): here it
// is a guest step that hasn't started.
vi.mock('@/app/_shell/useBookingSignIn', () => ({
  useBookingSignIn: () => ({
    stage: 'email',
    email: '',
    onEmailChange: () => {},
    sending: false,
    googleBusy: false,
    onSendCode: () => {},
    onGoogle: () => {},
    code: '',
    onCodeChange: () => {},
    onVerify: () => {},
    verifying: false,
    resentCount: 0,
    resendIn: 0,
    onResend: () => {},
    onUseDifferentEmail: () => {},
    fullName: '',
    onFullNameChange: () => {},
    finishing: false,
    onFinish: () => {},
    signedInAs: null,
    offline: false,
  }),
}));
vi.mock('@/lib/api/data/booking', () => ({
  useSessionTypes: () => remote,
  useSlots: () => remote,
  useUploadIntakeFile: () => vi.fn(),
  useRequestBooking: () => ({
    request: vi.fn(),
    isPending: false,
    isDone: false,
    error: null,
    reset: vi.fn(),
  }),
}));

beforeAll(() => {
  // jsdom has neither; Explore reads both (one card per row, the floating prompt).
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  window.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn(() => []),
  })) as unknown as typeof IntersectionObserver;
});
beforeEach(() => {
  canBook = true;
  inviter = null;
  lookupFor.mockReset();
  localStorage.clear();
});

describe('ExploreScreen — mentors can’t book (product, 2026-09-29)', () => {
  it('an open booking closes if the viewer becomes a mentor (review of #52)', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ExploreScreen />);
    await user.click(screen.getByRole('button', { name: 'Book session with Olajuwon' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // /me refetches mid-booking and the viewer is now a mentor.
    canBook = false;
    rerender(<ExploreScreen />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('link', { name: 'View profile: Olajuwon Samuel' })).toBeInTheDocument();
  });
});

describe('ExploreScreen — "Invited by" for an invited guest (PRD Invite Landing)', () => {
  it('a guest holding a live invite sees who invited them, as a note', async () => {
    const { rememberInviteCode } = await import('@/lib/utils/inviteCode');
    rememberInviteCode('damilola-7k2x');
    inviter = { firstName: 'Damilola', photoUrl: null };
    render(<ExploreScreen />);
    const note = screen.getByRole('note');
    expect(note).toHaveTextContent('Invited by Damilola. Your first session is free.');
    expect(note.querySelector('a, button')).toBeNull();
    expect(lookupFor).toHaveBeenLastCalledWith('damilola-7k2x');
  });

  it('no remembered invite: no bar, and nothing is looked up', () => {
    render(<ExploreScreen />);
    expect(screen.queryByRole('note')).toBeNull();
    expect(lookupFor).toHaveBeenLastCalledWith(null);
  });

  it('a code that can’t be joined: no bar', async () => {
    const { rememberInviteCode } = await import('@/lib/utils/inviteCode');
    rememberInviteCode('gone-0000');
    render(<ExploreScreen />);
    expect(screen.queryByRole('note')).toBeNull();
  });
});

describe('ExploreScreen — analytics (PRD 30)', () => {
  it('a profile opened from a card is an explore visit', async () => {
    const { takeProfileSource } = await import('@/lib/analytics/profileSource');
    render(<ExploreScreen />);
    const link = screen.getAllByRole('link').find((a) => a.getAttribute('href') === '/mentors/m1')!;
    link.addEventListener('click', (e) => e.preventDefault());
    link.click();
    expect(takeProfileSource('m1', new URLSearchParams())).toBe('explore');
  });

  it('the booking opened here says it began on Explore', async () => {
    const track = vi.spyOn(await import('@/lib/analytics/track'), 'track');
    const user = userEvent.setup();
    render(<ExploreScreen />);
    await user.click(screen.getByRole('button', { name: 'Book session with Olajuwon' }));
    expect(track).toHaveBeenCalledWith('booking_started', {
      entry_point: 'explore',
      is_guest: true,
    });
    track.mockRestore();
  });
});
