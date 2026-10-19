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

const mentor: Mentor = {
  id: 'm1',
  profileHref: '/mentors/m1',
  name: 'Olajuwon Samuel',
  firstName: 'Olajuwon',
  initials: 'OS',
  photoUrl: null,
  photoFocus: null,
  tone: 1,
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
