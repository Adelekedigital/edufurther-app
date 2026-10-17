import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OnboardingError, OnboardingState } from '@/lib/api/data/onboarding';
import { EMPTY_PLANS } from '@/lib/utils/onboardingAnswers';
import type { Viewer } from '@/types/mentor';
import { OnboardingScreen } from './OnboardingScreen';

const replace = vi.fn();
const push = vi.fn();
let search = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push }),
  useSearchParams: () => new URLSearchParams(search),
}));

let viewer: Viewer;
vi.mock('@/lib/api/data/viewer', () => ({ useViewer: () => viewer }));

const countries = [
  { id: 'c-gb', label: 'United Kingdom', code: 'GB' },
  { id: 'c-ng', label: 'Nigeria', code: 'NG' },
];
let catalogStatus: 'loading' | 'ready' | 'error';
const retryCountries = vi.fn();
vi.mock('@/lib/api/data/catalog', () => ({
  useCountries: () => ({ countries, status: catalogStatus, retry: retryCountries }),
  useDegreeLevels: () => ({
    levels: [{ id: 'dl-masters', code: 'masters' }],
    status: catalogStatus,
    retry: vi.fn(),
  }),
  useFieldsOfStudy: () => null,
}));

const ada = {
  id: 'm-ada',
  profileHref: '/mentors/ada-obi',
  name: 'Ada Obi',
  firstName: 'Ada',
  initials: 'AO',
  photoUrl: null,
  photoFocus: null,
  tone: 1,
  degreeLine: 'MSc, Law',
  institution: 'University of London',
  completedSessions: 5,
  reviewCount: 2,
  rating: 4.8,
  label: null,
  offer: 'free',
  nextAvailableAt: '2026-10-20T12:00:00Z',
  nextAvailableState: 'open',
  takingBookings: true,
  topics: [],
} as const;
let profileFails = false;
vi.mock('@/lib/api/data/profile', () => ({
  useMentorProfile: (h: string | null) => ({
    data: h === 'ada-obi' && !profileFails ? { mentor: ada } : null,
    // As the real hook: with no handle the query is disabled, which reads as loading.
    isLoading: h === null,
    error: profileFails ? { kind: 'server', message: 'x' } : null,
    notFound: false,
    retry: vi.fn(),
  }),
}));

let topicsLoading: boolean;
vi.mock('@/lib/api/data/mentors', () => ({
  useTopics: () => ({
    topics: topicsLoading
      ? []
      : [
          { id: 'o1', slug: 'program-selection', label: 'Program selection' },
          { id: 'o2', slug: 'school-selection', label: 'School selection' },
        ],
    isLoading: topicsLoading,
    error: null,
    retry: vi.fn(),
  }),
}));

let state: OnboardingState | null;
let loadError: OnboardingError | null;
const retryState = vi.fn();
const save = vi.fn();
let saveError: OnboardingError | null;
let pending: boolean;
vi.mock('@/lib/api/data/onboarding', () => ({
  useOnboarding: () => ({
    saved: null,
    state,
    isLoading: false,
    error: loadError,
    retry: retryState,
  }),
  useSaveOnboarding: () => ({ save, isPending: pending, error: saveError, reset: vi.fn() }),
}));
let matches: unknown = null;
vi.mock('@/lib/api/data/mentorMatches', () => ({
  useMentorMatches: () => ({ data: matches, isLoading: !matches, error: null, retry: vi.fn() }),
}));
let launcher: Record<string, unknown> = {};
vi.mock('@/app/_shell/BookingLauncher/BookingLauncher', () => ({
  BookingLauncher: (p: Record<string, unknown>) => {
    launcher = p;
    return null;
  },
}));

const mentee = { kind: 'member', id: 'u1', isMentor: false } as Viewer;
const fresh: OnboardingState = { lastStep: null, complete: false, needIds: [], plans: EMPTY_PLANS };

beforeEach(() => {
  viewer = mentee;
  catalogStatus = 'ready';
  topicsLoading = false;
  state = fresh;
  loadError = null;
  saveError = null;
  pending = false;
  save.mockReset().mockResolvedValue(undefined);
  replace.mockReset();
  search = '';
  profileFails = false;
  matches = null;
  launcher = {};
});

describe('OnboardingScreen', () => {
  it('shows the load error before anything else, and Try again retries', async () => {
    state = null;
    loadError = { kind: 'server', message: 'x' };
    render(<OnboardingScreen />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'We couldn’t load your answers',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retryState).toHaveBeenCalled();
    expect(retryCountries).toHaveBeenCalled();
  });

  it('waits for the help areas: step 1 never renders without its cards', () => {
    topicsLoading = true;
    render(<OnboardingScreen />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading your answers');
    expect(screen.queryByRole('group')).toBeNull();
  });

  it('shows the loading spinner only after 300 ms, so a quick load doesn’t flash', () => {
    vi.useFakeTimers();
    try {
      topicsLoading = true;
      const { container } = render(<OnboardingScreen />);
      expect(screen.getByRole('status')).toHaveTextContent('Loading your answers');
      expect(container.querySelector('main svg')).toBeNull();
      act(() => vi.advanceTimersByTime(299));
      expect(container.querySelector('main svg')).toBeNull();
      act(() => vi.advanceTimersByTime(1));
      expect(container.querySelector('main svg')).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('saves step 1 and moves focus to step 2’s heading', async () => {
    render(<OnboardingScreen />);
    const cont = screen.getByRole('button', { name: 'Continue' });
    expect(cont).toBeDisabled();
    expect(screen.getByText('To continue, add at least one area.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Find a program/ }));
    await userEvent.click(cont);
    expect(save).toHaveBeenCalledWith({ step: 'help', needIds: ['o1'] });
    const h1 = await screen.findByRole('heading', { name: 'Tell us about your study plans' });
    expect(h1).toHaveFocus();
  });

  it('keeps the answers and says so when a save fails', async () => {
    save.mockRejectedValue(new Error('down'));
    const { rerender } = render(<OnboardingScreen />);
    await userEvent.click(screen.getByRole('button', { name: /Find a program/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    saveError = { kind: 'offline', message: 'x' };
    rerender(<OnboardingScreen />);
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t save your answers');
    // The button stays enabled, so they can try again (design, 2026-10-17).
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Find a program/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('names what the server says is missing', () => {
    state = { ...fresh, lastStep: 'help', needIds: ['o1'] };
    saveError = { kind: 'conflict', message: 'x', missing: ['origin', 'field'] };
    render(<OnboardingScreen />);
    expect(
      screen.getByText('To continue, add where you’re from, what you want to study.'),
    ).toBeInTheDocument();
  });

  it('locks Back and Start over while a save runs', () => {
    state = { ...fresh, lastStep: 'help', needIds: ['o1'] };
    pending = true;
    render(<OnboardingScreen />);
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Start over' })).toBeDisabled();
  });

  it('shows the spinner at once on "already set up", even right after a quick load', () => {
    topicsLoading = true;
    const { container, rerender } = render(<OnboardingScreen />);
    expect(container.querySelector('main svg')).toBeNull();
    topicsLoading = false;
    state = { ...fresh, complete: true };
    rerender(<OnboardingScreen />);
    expect(screen.getByRole('status')).toHaveTextContent('You’re already set up');
    expect(container.querySelector('main svg')).not.toBeNull();
  });

  it('greets an onboarded mentee, then goes Home after 1.2 s', () => {
    vi.useFakeTimers();
    try {
      state = { ...fresh, complete: true };
      render(<OnboardingScreen />);
      expect(screen.getByRole('status')).toHaveTextContent(
        'You’re already set up. Taking you to your Home…',
      );
      expect(screen.getByRole('main')).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(1199));
      expect(replace).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(1));
      expect(replace).toHaveBeenCalledWith('/home');
    } finally {
      vi.useRealTimers();
    }
  });

  it('sends a guest to sign up, coming back here, and a mentor home', () => {
    viewer = { kind: 'guest' };
    const { rerender } = render(<OnboardingScreen />);
    expect(replace).toHaveBeenCalledWith('/signup?next=%2Fonboarding%2Fmentee');
    viewer = { kind: 'member', id: 'm1', isMentor: true } as Viewer;
    rerender(<OnboardingScreen />);
    expect(replace).toHaveBeenLastCalledWith('/home');
  });

  describe('a guest back from Book', () => {
    const planned: OnboardingState = {
      lastStep: 'help',
      complete: false,
      needIds: ['o1'],
      plans: { originId: 'c-ng', degree: 'masters', field: 'Law', destinationId: 'c-gb' },
    };

    it('keeps the banner over the steps, never "held", and names the mentor on the last button', () => {
      search = 'for=ada-obi&sid=st-1&time=2026-10-20T12:00:00Z';
      state = planned;
      render(<OnboardingScreen />);
      expect(screen.getByText('Almost there. Then you’ll book with Ada.')).toBeInTheDocument();
      expect(
        screen.getByText('Your pick is saved. We’ll take you back to book Ada.'),
      ).toBeInTheDocument();
      expect(screen.queryByText(/held/i)).toBeNull();
      // The banner stands in for the resume notice.
      expect(screen.queryByRole('button', { name: 'Start over' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Continue to book Ada' })).toBeEnabled();
    });

    it('shows only their mentor, and Book reopens on the questions with their time', async () => {
      search = 'for=ada-obi&sid=st-1&time=2026-10-20T12:00:00Z';
      state = planned;
      matches = {
        matches: [{ mentor: ada, reasons: [], level: 'Master’s', studyCountry: 'United Kingdom' }],
        exact: true,
        basis: null,
        forMentorBookable: true,
      };
      render(<OnboardingScreen />);
      await userEvent.click(screen.getByRole('button', { name: 'Continue to book Ada' }));
      expect(
        await screen.findByRole('heading', { name: 'You’re all set to book Ada' }),
      ).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /^Book/ }));
      expect(launcher).toMatchObject({
        initialTime: '2026-10-20T12:00:00Z',
        initialSessionTypeId: 'st-1',
        startAfterTime: true,
      });
    });

    it('ignores a tampered query: the normal flow, no banner', () => {
      search = 'for=../admin&sid=st-1';
      state = planned;
      render(<OnboardingScreen />);
      expect(screen.queryByText(/Almost there/)).toBeNull();
      expect(screen.getByRole('button', { name: 'See my matches' })).toBeInTheDocument();
    });

    const finish = async () => {
      await userEvent.click(
        screen.getByRole('button', { name: /^(Continue to book Ada|See my matches)$/ }),
      );
    };

    it('shows the notice and the other mentors when theirs is not taking bookings', async () => {
      search = 'for=ada-obi&sid=st-1';
      state = planned;
      matches = {
        matches: [
          {
            mentor: {
              ...ada,
              id: 'm-bo',
              profileHref: '/mentors/bo-ade',
              name: 'Bo Ade',
              firstName: 'Bo',
            },
            reasons: [],
            level: null,
            studyCountry: null,
          },
        ],
        exact: true,
        basis: null,
        forMentorBookable: false,
      };
      render(<OnboardingScreen />);
      await finish();
      expect(
        await screen.findByText('Ada isn’t taking new bookings right now'),
      ).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Mentors who fit your goals',
      );
    });

    it('still knows their mentor from the matches when the profile read fails', async () => {
      search = 'for=ada-obi&sid=st-1&time=2026-10-20T12:00:00Z';
      profileFails = true;
      state = planned;
      matches = {
        matches: [{ mentor: ada, reasons: [], level: null, studyCountry: null }],
        exact: true,
        basis: null,
        forMentorBookable: true,
      };
      render(<OnboardingScreen />);
      await finish();
      expect(
        await screen.findByRole('heading', { name: 'You’re all set to book Ada' }),
      ).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /^Book/ }));
      expect(launcher).toMatchObject({ initialTime: '2026-10-20T12:00:00Z', startAfterTime: true });
    });
  });
});
