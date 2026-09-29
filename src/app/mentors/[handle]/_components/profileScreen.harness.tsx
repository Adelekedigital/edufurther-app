/**
 * Shared test harness for MentorProfileScreen's test files: the mocked data
 * hooks and the per-test state they return. Each test file registers the
 * mocks itself (`vi.mock(path, () => mocks.x())`, hoisted by Vitest), so
 * import order can't leave the screen on the real hooks (review of #75).
 * Tests set `h.*` (e.g. `h.profile = state({...})`); beforeEach resets it.
 */
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

export type ProfileRemote = Remote<MentorProfile> & { notFound: boolean };

export const remote = <T,>(data: T): Remote<T> => ({
  data,
  isLoading: false,
  error: null,
  retry: vi.fn(),
});
export const idle = { data: null, isLoading: false, error: null, retry: vi.fn() };
export const reviewsState = (over: Partial<MentorReviewsResult> = {}): MentorReviewsResult => ({
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
export const state = (over: Partial<ProfileRemote>): ProfileRemote => ({
  data: null,
  isLoading: false,
  error: null,
  notFound: false,
  retry: vi.fn(),
  ...over,
});

/** What the mocked hooks return in the current test. */
export const h = {
  search: new URLSearchParams(),
  isGuest: false,
  viewerIsMentor: false,
  viewerLoading: false,
  // The Reviews tab's list and the review note.
  reviewsRemote: reviewsState(),
  reviewPrompt: null as ReviewPrompt,
  // The viewer's own review, what they can review, and sending.
  myReviewRemote: remote<MyReview | null>(null),
  // The author's full review, with when it was fetched (the screen insists on
  // a copy fetched after Edit opened).
  authoredRemote: { ...remote<MyReview>(null as unknown as MyReview), fetchedAt: 0, failedAt: 0 },
  reviewableRemote: remote<ReviewableSession[]>([]),
  sendState: { isPending: false, result: null, error: null } as {
    isPending: boolean;
    result: MyReview | null;
    error: { message: string } | null;
  },
  // The Similar mentors card's list.
  similarRemote: remote(similarMentors) as Remote<typeof similarMentors>,
  profile: state({}),
  // What the booking modal's queries return.
  sessionTypesRemote: idle as unknown,
  slotsRemote: idle as unknown,
  // The owner's edits: whether a save succeeds (closing the form), and errors.
  editOk: true,
  introErrors: {} as Record<string, string>,
  aboutError: null as string | null,
};

export const replace = vi.fn();
export const reviewsArgs = vi.fn();
export const sendReview = vi.fn();
export const similarArgs = vi.fn();
export const sessionTypesArgs = vi.fn();
export const coverSave = vi.fn();
export const coverUpload = vi.fn();
export const coverRemove = vi.fn();
export const coverPick = vi.fn();
export const saveIntro = vi.fn();
export const saveAbout = vi.fn();

const navigationMock = () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/mentors/gbenga',
  useSearchParams: () => h.search,
});

const appShellMock = () => ({
  useAppShell: () => {
    if (h.viewerLoading)
      return {
        viewer: { kind: 'loading', signedIn: true },
        member: null,
        chrome: 'loading',
        account: undefined,
        canBook: true,
      };
    if (h.isGuest)
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
      isMentee: !h.viewerIsMentor,
      isApprovedMentor: h.viewerIsMentor,
      isMentor: h.viewerIsMentor,
      completedSessions: 0,
      credits: null,
    } satisfies Extract<Viewer, { kind: 'member' }>;
    // canBookFor: mentors can't book.
    return {
      viewer: m,
      member: m,
      chrome: 'member',
      account: undefined,
      canBook: !h.viewerIsMentor,
    };
  },
});

const reviewsMock = () => ({
  REVIEW_PAGE_SIZE: 5,
  useMentorReviews: (...args: unknown[]) => {
    reviewsArgs(...args);
    return h.reviewsRemote;
  },
  // Like the real hook: nothing when the screen doesn't ask.
  useReviewPrompt: (_id: string | null, enabled: boolean) => (enabled ? h.reviewPrompt : null),
});

const reviewWriteMock = () => ({
  useMyReview: () => h.myReviewRemote,
  useAuthoredReview: () => h.authoredRemote,
  useReviewableSessions: () => h.reviewableRemote,
  useSendReview: () => ({ send: sendReview, reset: vi.fn(), ...h.sendState }),
});

const similarMock = () => ({
  useSimilarMentors: (...args: unknown[]) => {
    similarArgs(...args);
    return h.similarRemote;
  },
});

const profileMock = () => ({ useMentorProfile: () => h.profile });

const coverMock = () => ({
  BANNER_ACCEPT: 'image/jpeg,image/png,image/webp',
  useCoverEdit: () => ({
    save: coverSave,
    pickColor: coverPick,
    removedStamp: 0,
    saveState: 'idle',
    savedStamp: 0,
    upload: coverUpload,
    uploading: false,
    removeImage: coverRemove,
    removing: false,
    imageError: null,
    clearMessages: vi.fn(),
  }),
});

const bookingMock = () => ({
  useSessionTypes: (...a: unknown[]) => {
    sessionTypesArgs(...a);
    return h.sessionTypesRemote;
  },
  useSlots: () => h.slotsRemote,
  useUploadIntakeFile: () => vi.fn(),
  useRequestBooking: () => ({
    request: vi.fn(),
    isPending: false,
    isDone: false,
    error: null,
    reset: vi.fn(),
  }),
});

const profileEditMock = () => ({
  useProfileEdit: () => ({
    saveIntro: (before: unknown, after: unknown, done: () => void) => {
      saveIntro(before, after);
      if (h.editOk) done();
    },
    introSaving: false,
    introErrors: h.introErrors,
    resetIntro: vi.fn(),
    saveAbout: (text: string, done: () => void) => {
      saveAbout(text);
      if (h.editOk) done();
    },
    aboutSaving: false,
    aboutError: h.aboutError,
    resetAbout: vi.fn(),
  }),
});

/** The mocked modules, by name; each test file registers them with vi.mock. */
export const mocks = {
  navigation: navigationMock,
  appShell: appShellMock,
  reviews: reviewsMock,
  reviewWrite: reviewWriteMock,
  similar: similarMock,
  profile: profileMock,
  cover: coverMock,
  booking: bookingMock,
  profileEdit: profileEditMock,
};

beforeEach(() => {
  h.search = new URLSearchParams();
  h.isGuest = false;
  h.viewerIsMentor = false;
  h.viewerLoading = false;
  h.reviewsRemote = reviewsState();
  h.reviewPrompt = null;
  reviewsArgs.mockReset();
  h.similarRemote = { data: similarMentors, isLoading: false, error: null, retry: vi.fn() };
  similarArgs.mockReset();
  h.myReviewRemote = remote(null);
  h.authoredRemote = {
    ...remote<MyReview>(null as unknown as MyReview),
    data: null as unknown as MyReview,
    fetchedAt: 0,
    failedAt: 0,
  };
  h.reviewableRemote = remote([]);
  sendReview.mockReset();
  h.sendState = { isPending: false, result: null, error: null };
  h.sessionTypesRemote = idle;
  h.slotsRemote = idle;
  replace.mockReset();
  h.editOk = true;
  h.introErrors = {};
  h.aboutError = null;
  saveIntro.mockReset();
  saveAbout.mockReset();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
