import { act, render, screen } from '@testing-library/react';
import { sampleBookingFor, sampleParty } from '@/lib/utils/bookingTestFixtures';
import { rememberMoveFailure, takeMoveFailure } from '@/lib/api/data/moveSession';
import { MoveFailureSnackbar } from './MoveFailureSnackbar';

// A move whose page had gone when the booking was refused (the mentee left
// mid-move): the cancel went through, so Bookings, where the canceled session
// now is, says what happened, once.

const booking = sampleBookingFor({
  id: 'b1',
  side: 'mentee',
  status: 'cancelled',
  startsAt: '2026-10-04T17:00:00Z',
  other: sampleParty({ id: 'amara', name: 'Amara Okafor', firstName: 'Amara' }),
});

beforeEach(() => {
  takeMoveFailure();
});

describe('a move refused after the page had gone', () => {
  it('is said when Bookings opens, then forgotten', () => {
    rememberMoveFailure({ booking, why: 'taken', error: { kind: 'conflict', message: 'x' } });
    const first = render(<MoveFailureSnackbar timeZone="Africa/Lagos" />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'We couldn’t book your new time. That time was just taken. Your session on Sun, Oct 4 is canceled and your credit is back.',
    );
    first.unmount();
    render(<MoveFailureSnackbar timeZone="Africa/Lagos" />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('is said while Bookings is already open', () => {
    render(<MoveFailureSnackbar timeZone="Africa/Lagos" />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    act(() =>
      rememberMoveFailure({ booking, why: 'other', error: { kind: 'server', message: 'x' } }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'We couldn’t book your new time. Your session on Sun, Oct 4 is canceled',
    );
  });
});
