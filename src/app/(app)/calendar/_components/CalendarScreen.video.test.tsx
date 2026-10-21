import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Conferencing } from '@/lib/api/data/conferencing';
import type { MentorStatus } from '@/lib/api/data/mentorStatus';
import type { MentorDefaults } from '@/lib/api/data/sessionTypes';
import type { WeeklyHours } from '@/lib/api/data/weeklyHours';
import { emptyWeek } from '@/lib/utils/sessionTypeDraft';
import type { AppError, Remote, Viewer } from '@/types/mentor';
import { CalendarScreen } from './CalendarScreen';

// The video picker (Calendar v2 PR 2). A minimal copy of CalendarScreen.test's
// mocks; it moves onto calendarScreen.harness once that lands (#354).
vi.mock('next/navigation', () => ({
  usePathname: () => '/calendar',
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/lib/config/auth', async (orig) =>
  (await import('@/app/_shell/lockedPage.harness')).authFlags(await orig()),
);
const viewer: Viewer = {
  kind: 'member',
  id: 'm1',
  firstName: 'Gbenga',
  initials: 'G',
  isMentee: false,
  isApprovedMentor: true,
  isMentor: true,
  isListedMentor: true,
  completedSessions: 0,
  credits: null,
  avatarUrl: null,
  avatarFocus: null,
  coverKey: null,
  awaitingResponse: null,
};
vi.mock('@/app/_shell/useAppShell', async () => {
  const { accessFor } = await import('@/lib/utils/access');
  return {
    useAppShell: () => ({
      access: accessFor(viewer),
      viewer,
      member: viewer,
      chrome: 'member',
      account: undefined,
      nav: 'mentor',
    }),
  };
});

const remote = <T,>(data: T | null, over: Partial<Remote<T>> = {}): Remote<T> => ({
  data,
  isLoading: false,
  error: null,
  retry: vi.fn(),
  ...over,
});
const days = emptyWeek();
days[1] = { on: true, slots: [[1020, 1200]] };
const HOURS: WeeklyHours = {
  days,
  timeZone: 'Africa/Lagos',
  rules: [],
  otherZones: [],
  otherSlots: [],
};
const DEFAULTS: MentorDefaults = {
  durationMin: 60,
  noticeHours: 24,
  windowDays: 56,
  breakMin: 15,
  requiresApproval: false,
  maxWindowDays: 56,
};
vi.mock('@/lib/api/data/weeklyHours', () => ({
  useWeeklyHours: () => remote(HOURS),
  useSaveWeeklyHours: () => ({ save: vi.fn(), isPending: false, error: null, reset: vi.fn() }),
}));
vi.mock('@/lib/api/data/sessionTypes', () => ({
  useOwnSessionTypes: () => ({ data: [], isLoading: false, error: null, retry: vi.fn() }),
  useMentorDefaults: () => ({ ...remote(DEFAULTS), refreshing: false }),
  useSaveMentorDefaults: () => ({ save: vi.fn(), isPending: false, error: null, reset: vi.fn() }),
}));
vi.mock('@/lib/api/data/mentorStatus', () => ({
  useMentorStatus: () =>
    remote<MentorStatus>({ approved: true, listed: true, pausedByMentor: false, returnOn: null }),
  usePause: () => ({ pause: vi.fn(), isPending: false, error: null, reset: vi.fn() }),
  useResume: () => ({ resume: vi.fn(), isPending: false, error: null, reset: vi.fn() }),
}));
vi.mock('@/lib/api/data/calendar', () => ({
  useBookedDays: () => remote([]),
  useBlockedDays: () => remote({ days: [], exceptions: [] }),
  useSaveBlockedDays: () => ({ save: vi.fn(), isPending: false, error: null, reset: vi.fn() }),
}));
let video: Remote<Conferencing>;
const saveVideo = vi.fn();
let saveVideoError: AppError | null = null;
vi.mock('@/lib/api/data/conferencing', () => ({
  useConferencing: () => video,
  useSaveConferencing: () => ({
    save: saveVideo,
    isPending: false,
    error: saveVideoError,
    reset: vi.fn(),
  }),
}));

beforeEach(() => {
  video = remote<Conferencing>({ provider: 'daily', customUrl: null, isDefault: true });
  saveVideo.mockReset().mockResolvedValue(undefined);
  saveVideoError = null;
});

const announced = () =>
  screen
    .getAllByRole('status')
    .map((s) => s.textContent)
    .join(' | ');

describe('CalendarScreen: video for sessions', () => {
  it('names the video for sessions; the picker is Integrations’ cards, no Zoom, no Save', async () => {
    const user = userEvent.setup();
    render(<CalendarScreen />);
    expect(screen.getByText('Video for sessions: EduFurther video')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Change video for sessions' }));
    const dialog = screen.getByRole('dialog', { name: 'Video for sessions' });
    expect(within(dialog).queryByText(/Zoom/)).toBeNull();
    expect(within(dialog).getByRole('radio', { name: /EduFurther video/ })).toBeChecked();
    expect(within(dialog).getByText('Other option')).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Save' })).toBeNull();
    // The modal's own title is the only heading: the section's is hidden.
    expect(within(dialog).getAllByRole('heading')).toHaveLength(1);
    expect(within(dialog).queryByText(/Personal meeting link/)).toBeNull();
  });

  it('picking the other provider asks first; Keep changes nothing', async () => {
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(screen.getByRole('button', { name: 'Change video for sessions' }));
    await user.click(screen.getByRole('radio', { name: /Google Meet/ }));
    expect(screen.queryByRole('dialog', { name: 'Video for sessions' })).toBeNull();
    const confirm = screen.getByRole('alertdialog', { name: 'Switch to Google Meet?' });
    expect(confirm).toHaveTextContent(
      'Sessions already confirmed keep their EduFurther video link.',
    );
    await user.click(within(confirm).getByRole('button', { name: 'Keep EduFurther video' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(saveVideo).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Change video for sessions' })).toHaveFocus(),
    );
  });

  it('Switch saves, closes and says so', async () => {
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(screen.getByRole('button', { name: 'Change video for sessions' }));
    await user.click(screen.getByRole('radio', { name: /Google Meet/ }));
    await user.click(screen.getByRole('button', { name: 'Switch to Google Meet' }));
    expect(saveVideo).toHaveBeenCalledWith({ provider: 'google_meet', customUrl: null });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(announced()).toContain('Your video setting is saved.');
    expect(screen.getByRole('button', { name: 'Change video for sessions' })).toHaveFocus();
  });

  it('a failed switch keeps the confirm open with its error', async () => {
    saveVideo.mockRejectedValue({ message: 'We couldn’t save your video setting. Try again.' });
    const user = userEvent.setup();
    const { rerender } = render(<CalendarScreen />);
    await user.click(screen.getByRole('button', { name: 'Change video for sessions' }));
    await user.click(screen.getByRole('radio', { name: /Google Meet/ }));
    await user.click(screen.getByRole('button', { name: 'Switch to Google Meet' }));
    saveVideoError = { kind: 'server', message: 'We couldn’t save your video setting. Try again.' };
    rerender(<CalendarScreen />);
    const confirm = screen.getByRole('alertdialog', { name: 'Switch to Google Meet?' });
    expect(confirm).toHaveTextContent('We couldn’t save your video setting. Try again.');
    expect(screen.getByText('Video for sessions: EduFurther video')).toBeInTheDocument();
  });

  it('a personal link shows read-only, only when it’s the current choice', async () => {
    video = remote<Conferencing>({
      provider: 'custom',
      customUrl: 'https://meet.example.org/gbenga',
      isDefault: true,
    });
    const user = userEvent.setup();
    render(<CalendarScreen />);
    expect(screen.getByText('Video for sessions: Personal meeting link')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Change video for sessions' }));
    const dialog = screen.getByRole('dialog', { name: 'Video for sessions' });
    const own = within(dialog).getByRole('radio', { name: /Personal meeting link/ });
    expect(own).toBeChecked();
    expect(within(dialog).getByText('https://meet.example.org/gbenga')).toBeInTheDocument();
  });
});
