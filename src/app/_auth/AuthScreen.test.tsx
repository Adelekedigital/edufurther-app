import { render, screen } from '@testing-library/react';

const h = vi.hoisted(() => ({ booking: null as unknown }));
vi.mock('./useBookingContext', () => ({ useBookingContext: () => h.booking }));
vi.mock('./useSignInFlow', () => ({
  useSignInFlow: () => ({ form: {}, toast: null }),
}));
vi.mock('@/lib/api/data/auth', () => ({ authConfigured: true }));
// The form itself has its own tests: here, only what the screen hands it.
vi.mock('@/components/organisms/SignInForm', () => ({
  SignInForm: (p: { context?: React.ReactNode }) => <div data-testid="form">{p.context}</div>,
}));

const { AuthScreen } = await import('./AuthScreen');

const gbenga = (last: string) => ({
  mentorName: last ? `Gbenga ${last[0]}.` : 'Gbenga',
  firstName: 'Gbenga',
  initials: 'GE',
  tone: 3,
  photoUrl: null,
  photoFocus: null,
});

describe('AuthScreen — booking context', () => {
  beforeEach(() => {
    h.booking = null;
  });

  it('says whose booking it is, with one full stop', () => {
    h.booking = gbenga('Eze');
    render(<AuthScreen mode="login" role="mentee" next="/mentors/gbenga?book=st1&at=x" />);
    expect(screen.getByTestId('form')).toHaveTextContent(
      /Log in or sign up to finish booking Gbenga E\.$/,
    );
    expect(screen.getByTestId('form')).not.toHaveTextContent(/\.\.$/);
  });

  it('ends the sentence for a mentor with no last name', () => {
    h.booking = gbenga('');
    render(<AuthScreen mode="signup" role="mentee" next="/mentors/gbenga?book=st1&at=x" />);
    expect(screen.getByTestId('form')).toHaveTextContent(
      /Log in or sign up to finish booking Gbenga\.$/,
    );
  });

  it('hides it on the mentor page, as drawn', () => {
    h.booking = gbenga('Eze');
    render(<AuthScreen mode="signup" role="mentor" next="/mentors/gbenga?book=st1&at=x" />);
    expect(screen.getByTestId('form')).toBeEmptyDOMElement();
  });

  it('shows nothing without a booking', () => {
    render(<AuthScreen mode="login" role="mentee" next={null} />);
    expect(screen.getByTestId('form')).toBeEmptyDOMElement();
  });
});

describe('AuthScreen — a deleted account', () => {
  it('says the account is deleted and how to restore it, in place of a booking line', () => {
    h.booking = gbenga('Eze');
    render(<AuthScreen mode="login" role="mentee" next={null} deleted />);
    expect(screen.getByTestId('form')).toHaveTextContent(
      'Your account is deleted. Contact support within 30 days to restore it.',
    );
    expect(screen.getByTestId('form')).not.toHaveTextContent(/finish booking/);
  });
});
