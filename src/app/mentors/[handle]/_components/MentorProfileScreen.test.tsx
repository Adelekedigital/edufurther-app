import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fullProfile } from '@/components/organisms/ProfileHeader/profile.fixture';
import type { MentorProfile, Remote } from '@/types/mentor';
import { MentorProfileScreen } from './MentorProfileScreen';

const replace = vi.fn();
let search = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/mentors/gbenga',
  useSearchParams: () => search,
}));

vi.mock('@/app/_shell/useAppShell', () => ({
  useAppShell: () => ({
    viewer: { kind: 'member', id: 'viewer-1' },
    member: { id: 'viewer-1', initial: 'E' },
    chrome: 'member',
    account: undefined,
  }),
}));

type ProfileRemote = Remote<MentorProfile> & { notFound: boolean };
let profile: ProfileRemote;
vi.mock('@/lib/api/data/profile', () => ({ useMentorProfile: () => profile }));

const idle = { data: null, isLoading: false, error: null, retry: vi.fn() };
vi.mock('@/lib/api/data/booking', () => ({
  useSessionTypes: () => idle,
  useSlots: () => idle,
  useRequestBooking: () => ({
    request: vi.fn(),
    isPending: false,
    isDone: false,
    error: null,
    reset: vi.fn(),
  }),
}));

const state = (over: Partial<ProfileRemote>): ProfileRemote => ({
  data: null,
  isLoading: false,
  error: null,
  notFound: false,
  retry: vi.fn(),
  ...over,
});

beforeEach(() => {
  search = new URLSearchParams();
  replace.mockReset();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

describe('MentorProfileScreen — the four states', () => {
  it('loading', () => {
    profile = state({ isLoading: true });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading profile');
  });

  it('error, with a retry', async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    profile = state({ error: { kind: 'server', message: 'x' }, retry });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText('We couldn’t load this profile')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('not found (or not public) sends people back to Explore', () => {
    profile = state({ notFound: true });
    render(<MentorProfileScreen handle="nobody" />);
    expect(screen.getByText('This mentor profile isn’t available')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore mentors' })).toHaveAttribute(
      'href',
      '/explore',
    );
  });

  it('content: header, Book, and the tab in the URL', async () => {
    const user = userEvent.setup();
    profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Gbenga Elufisan' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Book a session' }).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('tab', { name: 'Sessions (1)' }));
    expect(replace).toHaveBeenCalledWith('/mentors/gbenga?tab=sessions', { scroll: false });
  });

  it('opens on the Sessions tab from ?tab=sessions', () => {
    search = new URLSearchParams('tab=sessions');
    profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('tab', { name: 'Sessions (1)' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Book session' })).toBeInTheDocument();
  });
});

describe('MentorProfileScreen — the mentor on their own page', () => {
  it('shows the owner bar and no way to book themselves', () => {
    profile = state({
      data: { ...fullProfile, owner: { approval: 'pending', listed: true } },
    });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(
      screen.getByText(/You’re viewing your own profile. Only you can see it until it’s approved./),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Book a session' })).not.toBeInTheDocument();
  });

  it('knows the owner by id even before the owner-only fields arrive', () => {
    profile = state({
      data: { ...fullProfile, mentor: { ...fullProfile.mentor, id: 'viewer-1' } },
    });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText(/You’re viewing your own profile./)).toBeInTheDocument();
  });
});
