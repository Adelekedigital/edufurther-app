import { render, screen } from '@testing-library/react';
import type { Mentor } from '@/types/mentor';
import { BookingLauncher } from './BookingLauncher';

// BookingFlow is covered by its own tests; stub it to capture the props the
// launcher wires, and avoid pulling the full flow (and the booking query hooks)
// into this unit.
vi.mock('@/components/organisms/BookingFlow/BookingFlow', () => ({
  BookingFlow: (p: { mentor: { name: string }; ratingUnknown?: boolean; hideProfileLink?: boolean }) => (
    <div
      data-testid="flow"
      data-rating-unknown={String(!!p.ratingUnknown)}
      data-hide-profile={String(!!p.hideProfileLink)}
    >
      {p.mentor.name}
    </div>
  ),
}));

const remote = () => ({ data: null, isLoading: false, error: null, retry: vi.fn() });
vi.mock('@/lib/api/data/booking', () => ({
  useSessionTypes: () => remote(),
  useSlots: () => remote(),
  useRequestBooking: () => ({
    request: vi.fn(),
    isPending: false,
    isDone: false,
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
});
