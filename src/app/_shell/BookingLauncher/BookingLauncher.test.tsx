import { render, screen } from '@testing-library/react';
import type { Mentor } from '@/types/mentor';
import { BookingLauncher } from './BookingLauncher';

// BookingFlow is covered by its own tests; stub it to capture the props the
// launcher wires, and avoid pulling the full flow (and the booking query hooks)
// into this unit.
vi.mock('@/components/organisms/BookingFlow/BookingFlow', () => ({
  BookingFlow: (p: {
    mentor: { name: string };
    ratingUnknown?: boolean;
    hideProfileLink?: boolean;
    onClose: () => void;
  }) => (
    <div
      data-testid="flow"
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

const remote = () => ({ data: null, isLoading: false, error: null, retry: vi.fn() });
let requestDone = false;
vi.mock('@/lib/api/data/booking', () => ({
  useSessionTypes: () => remote(),
  useSlots: () => remote(),
  useRequestBooking: () => ({
    request: vi.fn(),
    isPending: false,
    isDone: requestDone,
    error: null,
    reset: vi.fn(),
  }),
  useUploadIntakeFile: () => vi.fn(),
}));

const mentor = { name: 'Mariam Alamata', id: 'm1' } as unknown as Mentor;

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
});
