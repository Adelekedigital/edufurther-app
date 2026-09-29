import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Remote, Viewer } from '@/types/mentor';
import type { DeleteError, OwnSessionType } from '@/types/sessionType';
import { SessionTypesScreen } from './SessionTypesScreen';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/session-types',
  useRouter: () => ({ push }),
}));
vi.mock('@/lib/api/data/mentors', () => ({
  useTopics: () => ({
    topics: [{ slug: 'document-preparation', label: 'Document preparation', id: 'o4' }],
  }),
}));
const duplicate = vi.fn();
vi.mock('@/lib/api/data/sessionTypeEdit', () => ({
  useDuplicateSessionType: () => ({ duplicate, isPending: false }),
}));

let viewer: Viewer;
vi.mock('@/app/_shell/useAppShell', () => ({
  useAppShell: () => ({
    viewer,
    member: viewer.kind === 'member' ? viewer : null,
    chrome: viewer.kind === 'guest' ? 'guest' : 'member',
    account: undefined,
    nav: viewer.kind === 'member' && viewer.isMentor ? 'mentor' : 'unknown',
  }),
}));

const TYPE: OwnSessionType = {
  id: 'a',
  name: 'SOP draft review',
  description: '',
  durationMin: 60,
  noticeMin: 1440,
  isLive: true,
  topics: [],
  icon: 'video_call',
  iconChoice: null,
  questionCount: 0,
};
let list: Remote<OwnSessionType[]>;
const setLive = vi.fn();
const remove = vi.fn();
let deleteErr: DeleteError | null = null;
vi.mock('@/lib/api/data/sessionTypes', () => ({
  useOwnSessionTypes: () => list,
  useSetLive: () => setLive,
  useDeleteSessionType: () => ({ remove, isPending: false, error: deleteErr, reset: vi.fn() }),
}));

const mentor: Viewer = {
  kind: 'member',
  id: 'm1',
  firstName: 'Gbenga',
  initial: 'G',
  isMentee: false,
  isApprovedMentor: false,
  isMentor: true,
  completedSessions: 0,
  credits: null,
};
const idle = (over: Partial<Remote<OwnSessionType[]>> = {}): Remote<OwnSessionType[]> => ({
  data: null,
  isLoading: false,
  error: null,
  retry: vi.fn(),
  ...over,
});

beforeEach(() => {
  list = idle({ data: [TYPE] });
  deleteErr = null;
  setLive.mockClear();
  remove.mockClear();
});

describe('SessionTypesScreen', () => {
  it('while the viewer is unknown the list is loading — never "no session types"', () => {
    viewer = { kind: 'loading', signedIn: true };
    list = idle(); // the query is disabled until we know it's a mentor: no data, not loading
    render(<SessionTypesScreen />);
    expect(screen.getByRole('status', { name: 'Loading your session types' })).toBeInTheDocument();
    expect(screen.queryByText('Create your first session type')).toBeNull();
  });

  it('a guest is asked to log in and comes back here', () => {
    viewer = { kind: 'guest' };
    render(<SessionTypesScreen />);
    // The shell's header also offers Log in; the page's own one returns here.
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Log in' })).toHaveAttribute(
      'href',
      '/login?next=%2Fsession-types',
    );
  });

  it('a member without a mentor profile is told this page is for mentors', () => {
    viewer = { ...mentor, isMentor: false, isMentee: true } as Viewer;
    render(<SessionTypesScreen />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Session types are for mentors' }),
    ).toBeInTheDocument();
  });

  it('any mentor state (here, not approved) manages session types', () => {
    viewer = mentor;
    render(<SessionTypesScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Session types' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'SOP draft review' })).toBeInTheDocument();
  });

  it('delete confirms in a danger modal first', async () => {
    viewer = mentor;
    const user = userEvent.setup();
    render(<SessionTypesScreen />);
    await user.click(screen.getByRole('button', { name: 'More actions for SOP draft review' }));
    await user.click(screen.getByRole('menuitem', { name: /Delete/ }));
    expect(screen.getByRole('dialog', { name: 'Delete this session type?' })).toBeInTheDocument();
    expect(remove).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(remove).toHaveBeenCalledWith('a', expect.anything());
  });

  it('refused because sessions are booked: says how many, and offers switching it off', async () => {
    viewer = mentor;
    deleteErr = { kind: 'conflict', message: 'x', hasBookings: true, bookedCount: 2 };
    const user = userEvent.setup();
    render(<SessionTypesScreen />);
    await user.click(screen.getByRole('button', { name: 'More actions for SOP draft review' }));
    await user.click(screen.getByRole('menuitem', { name: /Delete/ }));
    const dialog = screen.getByRole('dialog', { name: 'This session type has bookings' });
    expect(dialog).toHaveTextContent('2 booked sessions are on “SOP draft review”');
    await user.click(screen.getByRole('button', { name: 'Switch it off' }));
    expect(setLive).toHaveBeenCalledWith('a', false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('signed in without a usable account: told why, never "for mentors"', () => {
    viewer = { kind: 'accountExists' };
    const { unmount } = render(<SessionTypesScreen />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'This email already has an EduFurther account.',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/for mentors/)).toBeNull();
    unmount();
    viewer = { kind: 'unlinked' };
    render(<SessionTypesScreen />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Your account isn’t ready yet.' }),
    ).toBeInTheDocument();
  });

  it('the switch asks first: showing, hiding, and hiding the last visible one (design update)', async () => {
    viewer = mentor;
    list = idle({ data: [TYPE, { ...TYPE, id: 'b', name: 'Visa prep', isLive: false }] });
    const user = userEvent.setup();
    render(<SessionTypesScreen />);
    await user.click(screen.getByRole('switch', { name: 'Visible to mentees: SOP draft review' }));
    // The only visible one: hiding it says what that means for the profile.
    let dialog = screen.getByRole('dialog', { name: 'Hide your last session type?' });
    expect(dialog).toHaveTextContent('Your profile will show “Not taking bookings”');
    await user.click(within(dialog).getByRole('button', { name: 'Keep visible' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(setLive).not.toHaveBeenCalled();
    await user.click(screen.getByRole('switch', { name: 'Visible to mentees: SOP draft review' }));
    dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Hide it' }));
    expect(setLive).toHaveBeenCalledWith('a', false);
    // Showing the hidden one asks too.
    await user.click(screen.getByRole('switch', { name: 'Visible to mentees: Visa prep' }));
    dialog = screen.getByRole('dialog', { name: 'Show “Visa prep” to mentees?' });
    await user.click(within(dialog).getByRole('button', { name: 'Show it' }));
    expect(setLive).toHaveBeenCalledWith('b', true);
  });

  it('Duplicate copies with a name not already used, and says what didn’t come across', async () => {
    viewer = mentor;
    const user = userEvent.setup();
    duplicate.mockResolvedValueOnce({
      id: 'new',
      name: 'SOP draft review (copy)',
      failed: ['hours'],
    });
    render(<SessionTypesScreen />);
    await user.click(screen.getByRole('button', { name: 'More actions for SOP draft review' }));
    await user.click(screen.getByRole('menuitem', { name: /Duplicate/ }));
    expect(duplicate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a', offeringIds: { 'document-preparation': 'o4' } }),
    );
    expect(
      await screen.findByText(
        '“SOP draft review (copy)” was added, but its dedicated hours didn’t copy. Check it before mentees see it.',
      ),
    ).toBeInTheDocument();
  });

  it('Edit goes to the edit screen; the share link books this type on the profile', async () => {
    const user = userEvent.setup();
    viewer = mentor;
    const write = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: write },
      configurable: true,
    });
    render(<SessionTypesScreen />);
    await user.click(screen.getByRole('button', { name: 'More actions for SOP draft review' }));
    await user.click(screen.getByRole('menuitem', { name: /Edit/ }));
    expect(push).toHaveBeenCalledWith('/session-types/a/edit');
    await user.click(screen.getByRole('button', { name: 'Copy share link for SOP draft review' }));
    expect(write).toHaveBeenCalledWith(expect.stringMatching(/\/mentors\/m1\?book=a$/));
    expect(await screen.findByText('Link copied')).toBeInTheDocument();
  });
});
