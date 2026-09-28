import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Remote, Viewer } from '@/types/mentor';
import type { DeleteError, OwnSessionType } from '@/types/sessionType';
import { SessionTypesScreen } from './SessionTypesScreen';

vi.mock('next/navigation', () => ({ usePathname: () => '/session-types' }));

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
  topic: null,
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
    await user.click(screen.getByRole('button', { name: 'Delete SOP draft review' }));
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
    await user.click(screen.getByRole('button', { name: 'Delete SOP draft review' }));
    const dialog = screen.getByRole('dialog', { name: 'This session type has bookings' });
    expect(dialog).toHaveTextContent('2 booked sessions are on “SOP draft review”');
    await user.click(screen.getByRole('button', { name: 'Switch it off' }));
    expect(setLive).toHaveBeenCalledWith('a', false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
