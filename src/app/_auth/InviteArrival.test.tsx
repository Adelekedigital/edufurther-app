import { render, screen } from '@testing-library/react';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
let session: { status: string; userId?: string } = { status: 'none' };
vi.mock('@/lib/api/data/session', () => ({ useSession: () => session }));

const { InviteArrival } = await import('./InviteArrival');
const { rememberInviteCode, storedInviteCode } = await import('@/lib/utils/inviteCode');

beforeEach(() => {
  replace.mockReset();
  session = { status: 'none' };
  sessionStorage.clear();
});

describe('/invite/{code}', () => {
  it('remembers a valid code for the visit, then opens sign-up', () => {
    render(<InviteArrival code="damilola-7k2x" />);
    expect(storedInviteCode()).toBe('damilola-7k2x');
    expect(replace).toHaveBeenCalledWith('/signup');
    // The region is there empty first, then says it (LiveRegion).
    expect(screen.getByRole('status')).toHaveTextContent('Opening sign-up…');
  });

  it('drops an invalid code (and any older one), and still opens sign-up', () => {
    rememberInviteCode('older-1234');
    render(<InviteArrival code={'"><script>alert(1)</script>'} />);
    expect(storedInviteCode()).toBeNull();
    expect(replace).toHaveBeenCalledWith('/signup');
    expect(document.body.innerHTML).not.toContain('<script>');
  });

  it('sends a signed-in member home and remembers nothing: an existing account never claims', () => {
    session = { status: 'present', userId: 'u1' };
    render(<InviteArrival code="damilola-7k2x" />);
    expect(storedInviteCode()).toBeNull();
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('waits while the session is unknown', () => {
    session = { status: 'unknown' };
    render(<InviteArrival code="damilola-7k2x" />);
    expect(replace).not.toHaveBeenCalled();
    expect(storedInviteCode()).toBeNull();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});
