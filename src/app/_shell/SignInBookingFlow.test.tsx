import { render, screen } from '@testing-library/react';

vi.mock('@/components/organisms/BookingFlow/BookingFlow', () => ({
  BookingFlow: (p: { isGuest: boolean; guest?: unknown }) => (
    <div data-testid="flow" data-guest={String(p.isGuest)} data-has-sign-in={String(!!p.guest)} />
  ),
}));
vi.mock('./useBookingSignIn', () => ({ useBookingSignIn: () => ({ stage: 'email' }) }));

const { SignInBookingFlow } = await import('./SignInBookingFlow');

const props = (isGuest: boolean | null) =>
  ({ isGuest, mentor: { profileHref: '/mentors/gbenga' } }) as unknown as Parameters<
    typeof SignInBookingFlow
  >[0];

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
    render(<SignInBookingFlow {...props(false)} />);
    expect(screen.getByTestId('flow')).toHaveAttribute('data-guest', 'false');
    expect(screen.getByTestId('flow')).toHaveAttribute('data-has-sign-in', 'false');
  });
});
