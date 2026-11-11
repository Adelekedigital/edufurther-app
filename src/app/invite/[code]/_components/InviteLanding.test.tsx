import { render, screen, within } from '@testing-library/react';
import type { Viewer } from '@/types/mentor';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

let viewer: Viewer = { kind: 'guest' };
vi.mock('@/lib/api/data/viewer', () => ({ useViewer: () => viewer }));

type R<T> = { data: T | null; isLoading: boolean; error: unknown; retry: () => void };
const remote = <T,>(data: T | null, over: Partial<R<T>> = {}): R<T> => ({
  data,
  isLoading: false,
  error: null,
  retry: vi.fn(),
  ...over,
});
type Inv = { firstName: string; photoUrl: string | null };
let lookup = remote<Inv>({
  firstName: 'Damilola',
  photoUrl: null,
});
let link = remote<{ code: string; active: boolean; url: string }>(null);
let schools = remote<string[]>(null);
const lookupFor = vi.fn();
const linkFor = vi.fn();
const schoolsFor = vi.fn();
vi.mock('@/lib/api/data/invite', () => ({
  useInviteLookup: (code: string | null) => (lookupFor(code), lookup),
  useInviteLink: (id: string | null, active: boolean) => (linkFor(id, active), link),
}));
vi.mock('@/lib/api/data/mentorSchools', () => ({
  SCHOOLS_MIN: 4,
  useMentorSchools: (active: boolean) => (schoolsFor(active), schools),
}));

const track = vi.fn();
vi.mock('@/lib/analytics/track', () => ({ track: (...a: unknown[]) => track(...a) }));

const { InviteLanding } = await import('./InviteLanding');
const { rememberInviteCode, storedInviteCode } = await import('@/lib/utils/inviteCode');

const mentee = { kind: 'member', id: 'u1', isMentor: false } as unknown as Viewer;
const FIVE = ['Oxford', 'Edinburgh', 'Toronto', 'Carnegie Mellon', 'TU Munich'];

beforeEach(() => {
  [replace, lookupFor, linkFor, schoolsFor, track].forEach((f) => f.mockReset());
  viewer = { kind: 'guest' };
  lookup = remote({ firstName: 'Damilola', photoUrl: null });
  link = remote<{ code: string; active: boolean; url: string }>(null);
  schools = remote<string[]>(null);
  localStorage.clear();
});

describe('/invite/{code}', () => {
  it('a guest on a valid link: the welcome names the inviter, and the code is remembered', () => {
    render(<InviteLanding code="damilola-7k2x" />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Work on your grad school applications alongside Damilola.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Invited by Damilola')).toBeInTheDocument();
    const benefits = screen.getByRole('list', { name: 'Why EduFurther' });
    expect(within(benefits).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Create my account' })).toHaveAttribute(
      'href',
      '/signup',
    );
    expect(screen.getByRole('link', { name: /Browse mentors first/ })).toHaveAttribute(
      'href',
      '/explore',
    );
    expect(storedInviteCode()).toBe('damilola-7k2x');
    expect(replace).not.toHaveBeenCalled();
  });

  it('has no way out but its two actions: the logo is not a link, no Log in', () => {
    render(<InviteLanding code="damilola-7k2x" />);
    expect(screen.getAllByRole('link')).toHaveLength(2);
    expect(screen.getByRole('img', { name: 'EduFurther' }).closest('a')).toBeNull();
  });

  it('a link that can’t be joined: the generic version, and any older code is cleared', () => {
    rememberInviteCode('older-1234');
    lookup = remote<Inv>(null);
    render(<InviteLanding code="gone-0000" />);
    expect(screen.getByText('You’re invited to EduFurther')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Get help with your grad school applications.',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Invited by/)).not.toBeInTheDocument();
    expect(storedInviteCode()).toBeNull();
  });

  it('a failed lookup: the generic version, but the code is kept for the claim', () => {
    lookup = remote<Inv>(null, { error: new Error('429') });
    render(<InviteLanding code="damilola-7k2x" />);
    expect(screen.getByText('You’re invited to EduFurther')).toBeInTheDocument();
    expect(storedInviteCode()).toBe('damilola-7k2x');
  });

  it('only the header while the lookup runs: no welcome flash', () => {
    lookup = remote<Inv>(null, { isLoading: true });
    render(<InviteLanding code="damilola-7k2x" />);
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'EduFurther' })).toBeInTheDocument();
    expect(storedInviteCode()).toBeNull();
  });

  it('waits for the schools as well, so the strip never pushes the buttons down', () => {
    schools = remote<string[]>(null, { isLoading: true });
    render(<InviteLanding code="damilola-7k2x" />);
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(schoolsFor).toHaveBeenLastCalledWith(true);
  });

  it('shows 4 or 5 schools, and hides the strip under 4 or on a failed read', () => {
    schools = remote(FIVE);
    const { unmount } = render(<InviteLanding code="damilola-7k2x" />);
    expect(screen.getByRole('heading', { name: 'Our mentors studied at' })).toBeInTheDocument();
    expect(screen.getByText('TU Munich')).toBeInTheDocument();
    expect(schoolsFor).toHaveBeenLastCalledWith(true);
    unmount();

    schools = remote(FIVE.slice(0, 3));
    const second = render(<InviteLanding code="damilola-7k2x" />);
    expect(screen.queryByText('Our mentors studied at')).not.toBeInTheDocument();
    second.unmount();

    schools = remote<string[]>(null, { error: new Error('500') });
    render(<InviteLanding code="damilola-7k2x" />);
    expect(screen.queryByText('Our mentors studied at')).not.toBeInTheDocument();
  });

  it('a signed-in mentee on someone else’s link: the existing-account card, nothing remembered', () => {
    viewer = mentee;
    link = remote({ code: 'tunde-9q4z', active: true, url: '' });
    render(<InviteLanding code="damilola-7k2x" />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'You already have an EduFurther account' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Home' })).toHaveAttribute('href', '/home');
    expect(lookupFor).toHaveBeenLastCalledWith(null);
    expect(schoolsFor).toHaveBeenLastCalledWith(false);
    expect(storedInviteCode()).toBeNull();
  });

  it('a mentee’s own link opens Home with InviteModal', () => {
    viewer = mentee;
    link = remote({ code: 'damilola-7k2x', active: true, url: '' });
    render(<InviteLanding code="damilola-7k2x" />);
    expect(replace).toHaveBeenCalledWith('/home?invite=open');
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(storedInviteCode()).toBeNull();
  });

  it('a mentor goes to their Home and never reads their invite link', () => {
    viewer = { kind: 'member', id: 'u2', isMentor: true } as unknown as Viewer;
    render(<InviteLanding code="damilola-7k2x" />);
    expect(replace).toHaveBeenCalledWith('/');
    expect(linkFor).toHaveBeenLastCalledWith(null, false);
    expect(storedInviteCode()).toBeNull();
  });

  it('never renders the code itself', () => {
    lookup = remote<Inv>(null);
    render(<InviteLanding code={'"><script>alert(1)</script>'} />);
    expect(document.body.innerHTML).not.toContain('<script>');
    expect(storedInviteCode()).toBeNull();
  });

  describe('invite_viewed (PRD 30)', () => {
    it('once per visit when the invite resolves, with nothing about the invite', () => {
      const { rerender } = render(<InviteLanding code="damilola-7k2x" />);
      rerender(<InviteLanding code="damilola-7k2x" />);
      expect(track).toHaveBeenCalledTimes(1);
      expect(track).toHaveBeenCalledWith('invite_viewed', {});
    });

    it('not while the lookup runs, nor for a link that can’t be joined or a member', () => {
      lookup = remote<Inv>(null, { isLoading: true });
      const loading = render(<InviteLanding code="damilola-7k2x" />);
      loading.unmount();
      lookup = remote<Inv>(null);
      const broken = render(<InviteLanding code="gone-0000" />);
      broken.unmount();
      viewer = mentee;
      render(<InviteLanding code="damilola-7k2x" />);
      expect(track).not.toHaveBeenCalled();
    });
  });
});
