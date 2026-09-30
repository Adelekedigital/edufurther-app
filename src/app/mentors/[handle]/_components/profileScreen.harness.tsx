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
import type { OwnSessionType } from '@/types/sessionType';

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
  /** Signed in but blocked from booking (e.g. account setup): bookBlockedFor says why. */
  viewerUnlinked: false,
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
  // The owner's own session types (Sessions tab) and the quick edit.
  ownTypes: idle as Remote<OwnSessionType[]>,
  quickOk: true,
  quickPending: false,
  quickError: null as { copy: string } | null,
  // What the booking modal's queries return.
  sessionTypesRemote: idle as unknown,
  slotsRemote: idle as unknown,
  // The owner's edits: whether a save succeeds (closing the form), and errors.
  editOk: true,
  introErrors: {} as Record<string, string>,
  aboutError: null as string | null,
  // The owner's photo upload.
  photoUploading: false,
  photoError: null as string | null,
  // The owner's topics and background editors.
  itemsOk: true,
  itemsError: null as string | null,
  /** A failed background refetch of the topics catalog (the cached list stays). */
  topicsRefetchFailed: false,
  /** Runs when a background save "lands", before the editor closes (e.g. swap the profile). */
  onBackgroundSaved: null as null | (() => void),
  /** Runs when a remove "lands", before the editor closes (e.g. drop the row). */
  onAwardRemoved: null as null | (() => void),
  /** Runs when an add "lands", before the editor closes (e.g. show the new row). */
  onAwardAdded: null as null | (() => void),
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
export const uploadPhoto = vi.fn();
export const saveAbout = vi.fn();
export const saveTopics = vi.fn();
export const addAward = vi.fn();
export const editAward = vi.fn();
export const removeAward = vi.fn();
export const addEducation = vi.fn();
export const editEducation = vi.fn();
export const removeEducation = vi.fn();
export const quickEdit = vi.fn();
export const restoreType = vi.fn();

/** An owner's session type as Session types lists it. */
export const ownType = (over: Partial<OwnSessionType> = {}): OwnSessionType => ({
  id: 'st1',
  name: 'SOP draft review',
  description: 'We’ll work through your SOP draft together.',
  durationMin: 60,
  noticeMin: 1440,
  isLive: true,
  topics: [{ code: 'application-documents', label: 'Application documents' }],
  icon: 'edit_document',
  iconChoice: null,
  questionCount: 0,
  isFeatured: false,
  pendingDeletion: null,
  booked: { count: 0, lastEndsAt: null },
  ...over,
});

/** The owner's own degrees, as GET /users/{id}/education gives them. */
export const ownEducation = [
  {
    id: 'e1',
    values: {
      school: 'Mississippi State University',
      degree: 'PhD',
      course: 'Sociology',
      start: 2023,
      end: 2027,
      current: true,
    },
    dateStart: '2023-08-15',
    dateEnd: '2027-05-15',
    levelId: 'dl-phd',
  },
  {
    id: 'e2',
    values: {
      school: 'Mississippi State University',
      degree: 'MSc',
      course: 'Sociology',
      start: 2021,
      end: 2023,
      current: false,
    },
    dateStart: '2021-08-15',
    dateEnd: '2023-05-15',
    levelId: 'dl-masters',
  },
];
export const saveBackground = vi.fn();

/** The catalog topics (ids for the fixture's slugs) and countries. */
export const catalogTopics = [
  { id: 'o1', slug: 'school-selection', label: 'School selection' },
  { id: 'o6', slug: 'scholarships-funding', label: 'Scholarships & funding' },
  { id: 'o2', slug: 'visa-and-interview', label: 'Visa and interview' },
  { id: 'o5', slug: 'test-preparation', label: 'Test preparation' },
];
export const catalogCountries = [
  { id: 'c-ng', label: 'Nigeria' },
  { id: 'c-us', label: 'United States' },
  { id: 'c-gh', label: 'Ghana' },
];

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
    if (h.viewerUnlinked)
      return {
        viewer: { kind: 'unlinked' },
        member: null,
        chrome: 'member',
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

const avatarMock = () => ({
  useAvatarUpload: () => ({
    accept: 'image/jpeg,image/png,image/webp',
    upload: uploadPhoto,
    uploading: h.photoUploading,
    error: h.photoError,
    dismissError: vi.fn(),
    uploadedStamp: 0,
  }),
});

const sessionTypesMock = () => ({
  useOwnSessionTypes: () => h.ownTypes,
  useRestoreSessionType: () => ({ restore: restoreType, pendingIds: [] as string[] }),
});

const sessionTypeQuickMock = () => ({
  useQuickEditSessionType: () => ({
    mutate: (vars: unknown, opts?: { onSuccess?: () => void }) => {
      quickEdit(vars);
      if (h.quickOk) opts?.onSuccess?.();
    },
    isPending: h.quickPending,
    error: h.quickError,
    reset: vi.fn(),
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

const profileItemsMock = () => ({
  useProfileItems: () => ({
    saveTopics: (ids: string[], done: () => void) => {
      saveTopics(ids);
      if (h.itemsOk) done();
    },
    topicsSaving: false,
    topicsError: h.itemsError,
    resetTopics: vi.fn(),
    saveBackground: (before: unknown, after: unknown, done: () => void) => {
      saveBackground(before, after);
      if (h.itemsOk) {
        h.onBackgroundSaved?.();
        done();
      }
    },
    backgroundSaving: false,
    backgroundError: h.itemsError,
    resetBackground: vi.fn(),
  }),
});

const catalogMock = () => ({
  useDegreeLevels: () => ({
    levels: [
      { id: 'dl-undergraduate', code: 'undergraduate' },
      { id: 'dl-masters', code: 'masters' },
      { id: 'dl-mba', code: 'mba' },
      { id: 'dl-phd', code: 'phd' },
    ],
    status: 'ready',
    retry: vi.fn(),
  }),
  useCountries: () => ({ countries: catalogCountries, status: 'ready', retry: vi.fn() }),
  useLanguageSearch: () => ({
    results: [
      { id: 'en', label: 'English' },
      { id: 'fr', label: 'French' },
    ],
    status: 'ready',
    retry: vi.fn(),
  }),
});

const topicsMock = () => ({
  useTopics: () => ({
    topics: catalogTopics,
    isLoading: false,
    error: h.topicsRefetchFailed ? { kind: 'offline', message: 'You’re offline.' } : null,
    retry: vi.fn(),
  }),
});

const profileEntriesMock = async () => ({
  // The pure body builders stay real.
  ...(await vi.importActual<object>('@/lib/api/data/profileEntries')),
  useOwnEducation: () => ({ entries: ownEducation, status: 'ready', retry: vi.fn() }),
  useEducationEdit: () => ({
    addEducation: (body: unknown, done: () => void) => {
      addEducation(body);
      if (h.itemsOk) done();
    },
    editEducation: (id: string, body: unknown, done: () => void) => {
      editEducation(id, body);
      if (h.itemsOk) done();
    },
    removeEducation: (id: string, done: () => void) => {
      removeEducation(id);
      if (h.itemsOk) done();
    },
    saving: false,
    removing: false,
    error: h.itemsError,
    reset: vi.fn(),
  }),
  useAwardEdit: () => ({
    addAward: (v: unknown, done: () => void) => {
      addAward(v);
      if (h.itemsOk) {
        h.onAwardAdded?.();
        done();
      }
    },
    editAward: (id: string, before: unknown, after: unknown, done: () => void) => {
      editAward(id, before, after);
      if (h.itemsOk) done();
    },
    removeAward: (id: string, done: () => void) => {
      removeAward(id);
      if (h.itemsOk) {
        h.onAwardRemoved?.();
        done();
      }
    },
    saving: false,
    removing: false,
    error: h.itemsError,
    reset: vi.fn(),
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
  avatar: avatarMock,
  booking: bookingMock,
  profileEdit: profileEditMock,
  profileItems: profileItemsMock,
  profileEntries: profileEntriesMock,
  catalog: catalogMock,
  topics: topicsMock,
  sessionTypes: sessionTypesMock,
  sessionTypeQuick: sessionTypeQuickMock,
};

beforeEach(() => {
  h.search = new URLSearchParams();
  h.isGuest = false;
  h.viewerIsMentor = false;
  h.viewerLoading = false;
  h.viewerUnlinked = false;
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
  h.photoUploading = false;
  h.photoError = null;
  uploadPhoto.mockReset();
  saveIntro.mockReset();
  saveAbout.mockReset();
  h.itemsOk = true;
  h.itemsError = null;
  h.topicsRefetchFailed = false;
  h.onBackgroundSaved = null;
  h.onAwardRemoved = null;
  h.onAwardAdded = null;
  addAward.mockReset();
  editAward.mockReset();
  removeAward.mockReset();
  addEducation.mockReset();
  editEducation.mockReset();
  removeEducation.mockReset();
  saveTopics.mockReset();
  saveBackground.mockReset();
  h.ownTypes = idle;
  h.quickOk = true;
  h.quickPending = false;
  h.quickError = null;
  quickEdit.mockReset();
  restoreType.mockReset();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
