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
const patchViewer = vi.fn();
vi.mock('@/lib/api/data/viewer', () => ({
  useViewer: () => viewer,
  patchViewer: (...a: unknown[]) => patchViewer(...a),
}));
const qc = {};
vi.mock('@tanstack/react-query', async (orig) => ({
  ...(await orig<typeof import('@tanstack/react-query')>()),
  useQueryClient: () => qc,
}));

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
const fresh: OnboardingState = {
  lastStep: null,
  migrated: false,
  complete: false,
  needIds: [],
  plans: EMPTY_PLANS,
};

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
  patchViewer.mockReset();
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

  it('marks a missing answer only once Continue is pressed, then lets it go', async () => {
    render(<OnboardingScreen />);
    const cont = screen.getByRole('button', { name: 'Continue' });
    // Enabled from the start, with nothing marked (design `fieldGuide=marked`).
    expect(cont).toBeEnabled();
    expect(screen.queryByText('Pick at least one area.')).toBeNull();
    await userEvent.click(cont);
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByText('Fill in the required fields to continue.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Pick at least one area.');
    // Focus lands on the first card, which says why (the alert may be skipped
    // by a screen reader, as it arrives already full).
    const first = screen.getByRole('button', { name: /Find a program/ });
    expect(first).toHaveFocus();
    expect(first).toHaveAccessibleDescription('Pick at least one area.');
    await userEvent.click(screen.getByRole('button', { name: /Find a program/ }));
    expect(screen.queryByText('Pick at least one area.')).toBeNull();
    expect(screen.queryByText('Fill in the required fields to continue.')).toBeNull();
  });

  it('marks each missing plan, focuses the first, and clears each as it’s answered', async () => {
    state = { ...fresh, lastStep: 'help', needIds: ['o1'] };
    render(<OnboardingScreen />);
    // Nothing is marked before Continue.
    expect(screen.queryByText('Select your home country.')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'See my matches' }));
    expect(save).not.toHaveBeenCalled();
    // Focus lands on the first gap.
    expect(screen.getByLabelText('Where are you from?')).toHaveFocus();
    for (const line of [
      'Select your home country.',
      'Pick the degree you’re applying for.',
      'Add what you want to study.',
      'Pick where you want to study.',
    ])
      expect(screen.getByText(line)).toBeInTheDocument();
    const field = screen.getByLabelText('What do you want to study?');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription(
      'Choose from the list, or type it if it’s not there. Add what you want to study.',
    );
    await userEvent.type(field, 'Law');
    expect(screen.queryByText('Add what you want to study.')).toBeNull();
    expect(field).not.toHaveAttribute('aria-invalid');
    // The rest stay marked until answered.
    expect(screen.getByText('Select your home country.')).toBeInTheDocument();
  });

  it('forgets the marks on Back', async () => {
    state = { ...fresh, lastStep: 'help', needIds: ['o1'] };
    render(<OnboardingScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'See my matches' }));
    expect(screen.getByText('Fill in the required fields to continue.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.queryByText('Fill in the required fields to continue.')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('saves step 1 and moves focus to step 2’s heading', async () => {
    render(<OnboardingScreen />);
    const cont = screen.getByRole('button', { name: 'Continue' });
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
    expect(screen.getByText('Fill in the required fields to continue.')).toBeInTheDocument();
    expect(screen.getByText('Select your home country.')).toBeInTheDocument();
    expect(screen.getByText('Add what you want to study.')).toBeInTheDocument();
    expect(screen.queryByText('Pick where you want to study.')).toBeNull();
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

  it('done at load: the viewer is marked complete, so /home doesn’t bounce back here', () => {
    state = { ...fresh, complete: true };
    render(<OnboardingScreen />);
    expect(patchViewer).toHaveBeenCalledWith(qc, { onboardingComplete: true });
  });

  it('not done at load: the viewer is left alone', () => {
    render(<OnboardingScreen />);
    expect(patchViewer).not.toHaveBeenCalled();
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

  it('already finished and sent from a booking: says so, then back to the booking', () => {
    vi.useFakeTimers();
    try {
      search = 'for=ada-obi&sid=st-1&time=2026-10-20T12:00:00Z&after=booking';
      state = { ...fresh, complete: true };
      render(<OnboardingScreen />);
      expect(screen.getByRole('status')).toHaveTextContent(
        'You’re already set up. Taking you back to your booking…',
      );
      act(() => vi.advanceTimersByTime(1200));
      expect(replace).toHaveBeenCalledWith('/mentors/ada-obi?book=st-1&at=2026-10-20T12%3A00%3A00Z');
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
      migrated: false,
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

    it('sent from a booking (after=booking): the credit line, then straight back to it', async () => {
      search = 'for=ada-obi&sid=st-1&time=2026-10-20T12:00:00Z&after=booking';
      state = planned;
      window.sessionStorage.setItem(
        'ef-booking-draft:u1',
        JSON.stringify({
          mentorId: 'm-ada',
          handle: 'ada-obi',
          sessionTypeId: 'st-1',
          time: '2026-10-20T12:00:00Z',
          answers: {},
          savedAt: Date.now(),
        }),
      );
      render(<OnboardingScreen />);
      expect(
        screen.getByText('Finish to book Ada and get 1 free session credit.'),
      ).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Back to booking' }));
      expect(save).toHaveBeenCalledWith(expect.objectContaining({ step: 'plans' }));
      // No matches on this path: back to the mentor, the booking reopened.
      expect(replace).toHaveBeenCalledWith('/mentors/ada-obi?book=st-1&at=2026-10-20T12%3A00%3A00Z');
      expect(screen.queryByRole('heading', { name: /all set to book/ })).toBeNull();
      // The booking will say the credit came.
      expect(JSON.parse(window.sessionStorage.getItem('ef-booking-draft:u1')!)).toMatchObject({
        finished: true,
      });
      window.sessionStorage.clear();
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

  describe('a migrated mentee (PRD H5)', () => {
    const brought: OnboardingState = {
      lastStep: null,
      migrated: true,
      complete: false,
      // 4 areas: over the new cap of 3, and kept.
      needIds: ['o1', 'o2', 'o3', 'o4'],
      plans: { ...EMPTY_PLANS, degree: 'masters' },
    };

    it('opens at the first gap with what they gave us, under the brought-over line', () => {
      state = brought;
      render(<OnboardingScreen />);
      expect(
        screen.getByRole('heading', { name: 'Tell us about your study plans' }),
      ).toBeInTheDocument();
      expect(
        screen.getByText('We brought over your earlier answers. Check them and continue.'),
      ).toBeInTheDocument();
      // Not the mid-way welcome back, and nothing to start over.
      expect(screen.queryByText(/Welcome back/)).toBeNull();
      expect(screen.queryByRole('button', { name: 'Start over' })).toBeNull();
    });

    it('starts at step 1 when the help areas are what is missing', () => {
      state = {
        ...brought,
        needIds: [],
        plans: { ...EMPTY_PLANS, degree: 'masters', field: 'Law' },
      };
      render(<OnboardingScreen />);
      expect(
        screen.getByRole('heading', { name: 'What would you like help with?' }),
      ).toBeInTheDocument();
    });

    it('keeps all 4 brought-over help areas when they go on', async () => {
      state = {
        ...brought,
        plans: { originId: 'c-ng', degree: 'masters', field: 'Law', destinationId: 'c-gb' },
      };
      render(<OnboardingScreen />);
      await userEvent.click(screen.getByRole('button', { name: 'See my matches' }));
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({ needIds: ['o1', 'o2', 'o3', 'o4'] }),
      );
    });

    it('still welcomes back someone who came back mid-way, with Start over', () => {
      state = { ...brought, migrated: false, lastStep: 'help' };
      render(<OnboardingScreen />);
      expect(screen.getByText(/Welcome back/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Start over' })).toBeInTheDocument();
    });
  });
});
