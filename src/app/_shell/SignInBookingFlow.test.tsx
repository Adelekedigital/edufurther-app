import { act, render, screen } from '@testing-library/react';
import type { BookingFlowProps } from '@/components/organisms/BookingFlow/BookingFlow';
import { readBookingDraft, saveBookingDraft } from '@/lib/utils/bookingDraft';
import type { Viewer } from '@/types/mentor';

let lastFlow: Partial<BookingFlowProps> & { guest?: unknown } = {};
vi.mock('@/components/organisms/BookingFlow/BookingFlow', () => ({
  BookingFlow: (p: BookingFlowProps & { guest?: unknown }) => {
    lastFlow = p;
    return (
      <div
        data-testid="flow"
        data-guest={String(p.isGuest)}
        data-has-sign-in={String(!!p.guest)}
        data-setup={String(!!p.setupUnfinished)}
      />
    );
  },
}));
vi.mock('./useBookingSignIn', () => ({ useBookingSignIn: () => ({ stage: 'email' }) }));
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
let viewer: Viewer = { kind: 'guest' };
vi.mock('./useAppShell', () => ({ useAppShell: () => ({ viewer }) }));
vi.mock('@/lib/config/auth', async (orig) => ({
  ...(await orig<typeof import('@/lib/config/auth')>()),
  ONBOARDING_LIVE: true,
}));

const { SignInBookingFlow } = await import('./SignInBookingFlow');

const props = (isGuest: boolean | null, over: Record<string, unknown> = {}) =>
  ({
    isGuest,
    mentor: { id: 'm1', profileHref: '/mentors/gbenga' },
    ...over,
  }) as unknown as Parameters<typeof SignInBookingFlow>[0];

const member = (over: Record<string, unknown> = {}) =>
  ({
    kind: 'member',
    id: 'u1',
    firstName: 'Ada',
    isMentor: false,
    isMentee: true,
    isApprovedMentor: false,
    completedSessions: 0,
    credits: null,
    ...over,
  }) as unknown as Viewer;

afterEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.clear();
  push.mockReset();
  viewer = { kind: 'guest' };
});

describe('SignInBookingFlow', () => {
  it('waits while the viewer is unknown, then latches the first answer', () => {
    const { rerender } = render(<SignInBookingFlow {...props(null)} />);
    expect(screen.queryByTestId('flow')).toBeNull();

    rerender(<SignInBookingFlow {...props(true)} />);
    expect(screen.getByTestId('flow')).toHaveAttribute('data-has-sign-in', 'true');

    // Signing in turns isGuest off mid-flow: the guest booking stays a guest's.
    rerender(<SignInBookingFlow {...props(false)} />);
    expect(screen.getByTestId('flow')).toHaveAttribute('data-guest', 'true');
    expect(screen.getByTestId('flow')).toHaveAttribute('data-has-sign-in', 'true');
  });

  it('gives a member’s booking no sign-in at all', () => {
    viewer = member();
    render(<SignInBookingFlow {...props(false)} />);
    expect(screen.getByTestId('flow')).toHaveAttribute('data-guest', 'false');
    expect(screen.getByTestId('flow')).toHaveAttribute('data-has-sign-in', 'false');
    expect(screen.getByTestId('flow')).toHaveAttribute('data-setup', 'false');
  });

  it('an unfinished mentee: Finish setup keeps the booking and goes to onboarding', () => {
    viewer = member({ onboardingComplete: false });
    render(<SignInBookingFlow {...props(false)} />);
    expect(screen.getByTestId('flow')).toHaveAttribute('data-setup', 'true');
    act(() =>
      lastFlow.onFinishSetup!({
        sessionTypeId: 'st1',
        time: '2026-10-20T09:00:00Z',
        answers: { q1: { text: 'Private words' } },
      }),
    );
    expect(readBookingDraft('u1')).toMatchObject({
      mentorId: 'm1',
      handle: 'gbenga',
      answers: { q1: { text: 'Private words' } },
    });
    const to = push.mock.calls[0]![0] as string;
    expect(to).toBe('/onboarding?for=gbenga&sid=st1&time=2026-10-20T09%3A00%3A00Z&after=booking');
    // The answers never go in the URL.
    expect(to).not.toMatch(/Private/);
  });

  it('back from onboarding: reopens on the confirm step with the answers, and says the credit came', async () => {
    saveBookingDraft('u1', {
      mentorId: 'm1',
      handle: 'gbenga',
      sessionTypeId: 'st1',
      time: '2026-10-20T09:00:00Z',
      answers: { q1: { text: 'Kept' } },
      finished: true,
    });
    viewer = member({ onboardingComplete: true });
    // The profile's reopen link carries the kept time.
    render(<SignInBookingFlow {...props(false, { initialTime: '2026-10-20T09:00:00Z' })} />);
    expect(lastFlow).toMatchObject({
      startAfterTime: true,
      initialAnswers: { q1: { text: 'Kept' } },
    });
    // Into the region already there, on the next tick.
    expect(await screen.findByText('You’re all set. 1 free credit added.')).toBeInTheDocument();
    // Said once.
    expect(readBookingDraft('u1')?.finished).toBe(false);
  });

  it('ignores a draft for another mentor and leaves it be; clears its own once sent', () => {
    saveBookingDraft('u1', {
      mentorId: 'someone-else',
      handle: 'x',
      sessionTypeId: 'st1',
      time: '2026-10-20T09:00:00Z',
      answers: {},
    });
    viewer = member();
    const { rerender } = render(<SignInBookingFlow {...props(false)} />);
    expect(lastFlow.initialAnswers).toBeUndefined();
    rerender(<SignInBookingFlow {...props(false, { requestDone: true })} />);
    expect(readBookingDraft('u1')?.mentorId).toBe('someone-else');
  });

  it('starts clean when this mentor is opened any other way (another time, another session)', () => {
    saveBookingDraft('u1', {
      mentorId: 'm1',
      handle: 'gbenga',
      sessionTypeId: 'st1',
      time: '2026-10-20T09:00:00Z',
      answers: { q1: { text: 'Kept' } },
      finished: true,
    });
    viewer = member();
    const a = render(
      <SignInBookingFlow {...props(false, { initialTime: '2026-10-21T10:00:00Z' })} />,
    );
    expect(lastFlow.initialAnswers).toBeUndefined();
    expect(lastFlow.missedNote).toBeUndefined();
    a.unmount();
    render(
      <SignInBookingFlow
        {...props(false, { initialTime: '2026-10-20T09:00:00Z', sessionTypeId: 'st2' })}
      />,
    );
    expect(lastFlow.initialAnswers).toBeUndefined();
    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it('a guest who signs in to an unfinished account gets Finish setup too', () => {
    viewer = member({ onboardingComplete: false });
    render(<SignInBookingFlow {...props(true)} />);
    expect(screen.getByTestId('flow')).toHaveAttribute('data-has-sign-in', 'true');
    expect(screen.getByTestId('flow')).toHaveAttribute('data-setup', 'true');
    expect(lastFlow.onFinishSetup).toBeInstanceOf(Function);
  });

  it('clears this mentor’s draft once the booking is sent', () => {
    saveBookingDraft('u1', {
      mentorId: 'm1',
      handle: 'gbenga',
      sessionTypeId: 'st1',
      time: '2026-10-20T09:00:00Z',
      answers: {},
    });
    viewer = member();
    const at = { initialTime: '2026-10-20T09:00:00Z' };
    const { rerender } = render(<SignInBookingFlow {...props(false, at)} />);
    rerender(<SignInBookingFlow {...props(false, { ...at, requestDone: true })} />);
    expect(readBookingDraft('u1')).toBeNull();
  });
});
