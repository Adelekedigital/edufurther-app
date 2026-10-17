import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OnboardingError, OnboardingState } from '@/lib/api/data/onboarding';
import { EMPTY_PLANS } from '@/lib/utils/onboardingAnswers';
import type { Viewer } from '@/types/mentor';
import { OnboardingScreen } from './OnboardingScreen';

const replace = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push }) }));

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
vi.mock('@/lib/api/data/mentorMatches', () => ({
  useMentorMatches: () => ({ data: null, isLoading: true, error: null, retry: vi.fn() }),
}));
vi.mock('@/app/_shell/BookingLauncher/BookingLauncher', () => ({ BookingLauncher: () => null }));

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
});
