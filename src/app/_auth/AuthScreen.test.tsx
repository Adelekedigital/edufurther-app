import { render, screen } from '@testing-library/react';

const h = vi.hoisted(() => ({
  booking: null as unknown,
  inviter: null as { firstName: string; photoUrl: string | null } | null,
  looked: [] as (string | null)[],
}));
vi.mock('@/lib/api/data/invite', () => ({
  useInviteLookup: (code: string | null) => {
    h.looked.push(code);
    return { data: code ? h.inviter : null, isLoading: false, error: null, retry: () => {} };
  },
}));
// The flow refreshes the cached viewer after a sign-up role save.
vi.mock('@tanstack/react-query', async (orig) => ({
  ...(await orig<typeof import('@tanstack/react-query')>()),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock('./useBookingContext', () => ({ useBookingContext: () => h.booking }));
vi.mock('./useSignInFlow', () => ({
  useSignInFlow: () => ({ form: {}, toast: null }),
}));
vi.mock('@/lib/api/data/auth', async (orig) => ({
  authConfigured: true,
  takeAccountDeleted: (await orig<typeof import('@/lib/api/data/auth')>()).takeAccountDeleted,
}));
// The form itself has its own tests: here, only what the screen hands it.
vi.mock('@/components/organisms/SignInForm', () => ({
  SignInForm: (p: { context?: React.ReactNode }) => <div data-testid="form">{p.context}</div>,
}));

const { AuthScreen } = await import('./AuthScreen');
const { rememberInviteCode } = await import('@/lib/utils/inviteCode');

const gbenga = (last: string) => ({
  mentorName: last ? `Gbenga ${last[0]}.` : 'Gbenga',
  firstName: 'Gbenga',
  initials: 'GE',
  cover: 'sand',
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
  beforeEach(() => sessionStorage.clear());

  it('a shared ?deleted=1 link, with no flag from this tab, says nothing', () => {
    render(<AuthScreen mode="login" role="mentee" next={null} deleted />);
    expect(screen.getByTestId('form')).toBeEmptyDOMElement();
  });

  it('once only: a reload of the same URL says nothing', () => {
    sessionStorage.setItem('ef-account-deleted', '1');
    const first = render(<AuthScreen mode="login" role="mentee" next={null} deleted />);
    expect(screen.getByTestId('form')).toHaveTextContent('Your account is deleted.');
    first.unmount();
    render(<AuthScreen mode="login" role="mentee" next={null} deleted />);
    expect(screen.getByTestId('form')).toBeEmptyDOMElement();
  });

  it('the notice is said into a status region that was there before its words', () => {
    sessionStorage.setItem('ef-account-deleted', '1');
    render(<AuthScreen mode="login" role="mentee" next={null} deleted />);
    const region = screen
      .getAllByRole('status')
      .find((el) => el.textContent?.includes('Your account is deleted.'));
    expect(region).toBeDefined();
    expect(region!.tagName).toBe('P');
  });

  it('says the account is deleted and how to restore it, in place of a booking line', () => {
    h.booking = gbenga('Eze');
    sessionStorage.setItem('ef-account-deleted', '1');
    render(<AuthScreen mode="login" role="mentee" next={null} deleted />);
    expect(screen.getByTestId('form')).toHaveTextContent(
      'Your account is deleted. Contact support within 30 days to restore it.',
    );
    expect(screen.getByTestId('form')).not.toHaveTextContent(/finish booking/);
  });
});

describe('AuthScreen — arriving through an invite (issue 281)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    h.booking = null;
    h.inviter = null;
    h.looked = [];
  });

  it('on sign-up, names the inviter above the title', () => {
    rememberInviteCode('damilola-7k2x');
    h.inviter = { firstName: 'Damilola', photoUrl: null };
    render(<AuthScreen mode="signup" role="mentee" next={null} />);
    expect(h.looked).toContain('damilola-7k2x');
    expect(screen.getByTestId('form')).toHaveTextContent(
      'Damilola invited you. Sign up and your invite is saved.',
    );
  });

  it('on log-in, says invites count for new accounts', () => {
    rememberInviteCode('damilola-7k2x');
    h.inviter = { firstName: 'Damilola', photoUrl: null };
    render(<AuthScreen mode="login" role="mentee" next={null} />);
    expect(screen.getByTestId('form')).toHaveTextContent(
      'Damilola invited you. Invites count for new accounts.',
    );
  });

  it('an unknown, retired or revoked code: no line and no error', () => {
    rememberInviteCode('gone-1234');
    render(<AuthScreen mode="signup" role="mentee" next={null} />);
    expect(screen.getByTestId('form')).toBeEmptyDOMElement();
  });

  it('no invite this visit: nothing is looked up', () => {
    h.inviter = { firstName: 'Damilola', photoUrl: null };
    render(<AuthScreen mode="signup" role="mentee" next={null} />);
    expect(h.looked.every((c) => c === null)).toBe(true);
    expect(screen.getByTestId('form')).toBeEmptyDOMElement();
  });

  it('shows on the mentor sign-up too: any new account claims it', () => {
    rememberInviteCode('damilola-7k2x');
    h.inviter = { firstName: 'Damilola', photoUrl: null };
    render(<AuthScreen mode="signup" role="mentor" next={null} />);
    expect(screen.getByTestId('form')).toHaveTextContent('Damilola invited you.');
  });

  it('keeps the line once the claim clears the stored code', () => {
    rememberInviteCode('damilola-7k2x');
    h.inviter = { firstName: 'Damilola', photoUrl: null };
    const view = render(<AuthScreen mode="signup" role="mentee" next={null} />);
    sessionStorage.clear();
    view.rerender(<AuthScreen mode="signup" role="mentee" next={null} />);
    expect(screen.getByTestId('form')).toHaveTextContent('Damilola invited you.');
  });

  it('a booking’s line comes first: one line in the slot', () => {
    rememberInviteCode('damilola-7k2x');
    h.inviter = { firstName: 'Damilola', photoUrl: null };
    h.booking = gbenga('Eze');
    render(<AuthScreen mode="signup" role="mentee" next="/mentors/gbenga?book=st1&at=x" />);
    expect(screen.getByTestId('form')).toHaveTextContent(/finish booking Gbenga E\.$/);
    expect(screen.getByTestId('form')).not.toHaveTextContent('invited you');
  });
});
