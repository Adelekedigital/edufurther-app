import { render, screen } from '@testing-library/react';
import type { Mentor, Viewer } from '@/types/mentor';
import { ExploreScreen } from './ExploreScreen';

// Regression (product, 2026-09-30): a pending mentor saw Explore's match prompt.
type Member = Extract<Viewer, { kind: 'member' }>;
let member: Member | null = null;
vi.mock('@/app/_shell/useAppShell', async (actual) => ({
  ...(await actual<typeof import('@/app/_shell/useAppShell')>()),
  MATCH_CALL_URL: 'https://cal.test/match',
  useAppShell: () => ({
    viewer: member ?? { kind: 'guest' },
    member,
    chrome: member ? 'member' : 'guest',
    account: undefined,
    nav: member?.isMentor ? 'mentor' : 'mentee',
    canBook: !member?.isMentor,
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
    mentors: Array.from({ length: 6 }, (_, i) => ({
      ...mentor,
      id: `m${i}`,
      profileHref: `/mentors/m${i}`,
    })),
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
  // Constructed with `new` by the floating prompt; classes, not arrow mocks.
  class Observer {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  window.ResizeObserver = Observer as unknown as typeof ResizeObserver;
  window.IntersectionObserver = Observer as unknown as typeof IntersectionObserver;
});

const viewer = (over: Partial<Member>): Member => ({
  kind: 'member',
  id: 'u1',
  firstName: 'Ada',
  initial: 'A',
  isMentee: true,
  isApprovedMentor: false,
  isMentor: false,
  completedSessions: 0,
  credits: null,
  ...over,
});
const prompt = () => screen.queryByText('Not sure who’s right for you?');

describe('Explore match prompt: mentees only (product, 2026-09-30)', () => {
  it('a mentee with 2 or fewer sessions sees it', () => {
    member = viewer({ completedSessions: 2 });
    render(<ExploreScreen />);
    expect(prompt()).toBeInTheDocument();
  });

  it('a mentor whose approval is pending never does', () => {
    member = viewer({ isMentor: true, isApprovedMentor: false, isMentee: false });
    render(<ExploreScreen />);
    expect(prompt()).toBeNull();
  });

  it('a mentee with 3 or more sessions doesn’t (design: hidden from 3)', () => {
    member = viewer({ completedSessions: 3 });
    render(<ExploreScreen />);
    expect(prompt()).toBeNull();
  });
});
