import { render, screen } from '@testing-library/react';
import { deviceTimeZone } from '@/lib/utils/format';
import type { Mentor } from '@/types/mentor';
import { BookingLauncher } from './BookingLauncher';

// BookingFlow is covered by its own tests; stub it to capture the props the
// launcher wires, and avoid pulling the full flow (and the booking query hooks)
// into this unit.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
// A member who has finished onboarding: no setup box, no draft.
vi.mock('@/app/_shell/useAppShell', () => ({
  useAppShell: () => ({ viewer: { kind: 'member', id: 'u1', isMentor: false } }),
}));
vi.mock('@/components/organisms/BookingFlow/BookingFlow', () => ({
  BookingFlow: (p: {
    mentor: { name: string };
    ratingUnknown?: boolean;
    hideProfileLink?: boolean;
    sessionTypeId?: string | null;
    startAfterTime?: boolean;
    onClose: () => void;
  }) => (
    <div
      data-testid="flow"
      data-type={String(p.sessionTypeId)}
      data-after-time={String(!!p.startAfterTime)}
      data-rating-unknown={String(!!p.ratingUnknown)}
      data-hide-profile={String(!!p.hideProfileLink)}
    >
      {p.mentor.name}
      <button type="button" onClick={p.onClose}>
        Close flow
      </button>
    </div>
  ),
}));

const remote = (data: unknown = null) => ({ data, isLoading: false, error: null, retry: vi.fn() });
let requestDone = false;
let types: { id: string }[] | null = null;
const slotsArgs = vi.fn();
vi.mock('@/lib/api/data/booking', () => ({
  useSessionTypes: () => remote(types),
  useSlots: (...a: unknown[]) => {
    slotsArgs(...a);
    return remote();
  },
  useRequestBooking: () => ({
    request: vi.fn(),
    isPending: false,
    isDone: requestDone,
    error: null,
    reset: vi.fn(),
  }),
  useUploadIntakeFile: () => vi.fn(),
}));

const mentor = {
  name: 'Mariam Alamata',
  id: 'm1',
  profileHref: '/mentors/mariam',
} as unknown as Mentor;

describe('BookingLauncher', () => {
  it('renders nothing when no mentor is set', () => {
    const { container } = render(<BookingLauncher mentor={null} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('opens the booking flow for a mentor, threading ratingUnknown and hideProfileLink', () => {
    render(<BookingLauncher mentor={mentor} ratingUnknown hideProfileLink onClose={vi.fn()} />);
    const flow = screen.getByTestId('flow');
    expect(flow).toHaveTextContent('Mariam Alamata');
    expect(flow).toHaveAttribute('data-rating-unknown', 'true');
    expect(flow).toHaveAttribute('data-hide-profile', 'true');
  });

  it('calls onBooked when the flow closes after a sent request, and only then', async () => {
    const onBooked = vi.fn();
    const onClose = vi.fn();
    requestDone = false;
    const { unmount } = render(
      <BookingLauncher mentor={mentor} onClose={onClose} onBooked={onBooked} />,
    );
    screen.getByRole('button', { name: 'Close flow' }).click();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onBooked).not.toHaveBeenCalled();
    unmount();

    requestDone = true;
    render(<BookingLauncher mentor={mentor} onClose={onClose} onBooked={onBooked} />);
    screen.getByRole('button', { name: 'Close flow' }).click();
    expect(onBooked).toHaveBeenCalledTimes(1);
    requestDone = false;
  });

  it('books the offering remembered from before sign-up while it is still offered, else the first', () => {
    types = [{ id: 'st-general' }, { id: 'st-cv' }];
    const { unmount } = render(
      <BookingLauncher
        mentor={mentor}
        initialSessionTypeId="st-cv"
        startAfterTime
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId('flow')).toHaveAttribute('data-type', 'st-cv');
    expect(screen.getByTestId('flow')).toHaveAttribute('data-after-time', 'true');
    unmount();
    render(<BookingLauncher mentor={mentor} initialSessionTypeId="st-gone" onClose={vi.fn()} />);
    expect(screen.getByTestId('flow')).toHaveAttribute('data-type', 'st-general');
    types = null;
  });

  it('asks for times in the zone it is given, else the device’s', () => {
    types = [{ id: 'st-general' }];
    const { unmount } = render(
      <BookingLauncher mentor={mentor} timeZone="America/Chicago" onClose={vi.fn()} />,
    );
    expect(slotsArgs).toHaveBeenLastCalledWith('m1', 'st-general', 'America/Chicago');
    unmount();
    render(<BookingLauncher mentor={mentor} onClose={vi.fn()} />);
    expect(slotsArgs).toHaveBeenLastCalledWith('m1', 'st-general', deviceTimeZone());
    types = null;
  });
});
