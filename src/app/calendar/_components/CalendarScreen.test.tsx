import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { WeeklyHours } from '@/lib/api/data/weeklyHours';
import type { MentorDefaults } from '@/lib/api/data/sessionTypes';
import { emptyWeek } from '@/lib/utils/sessionTypeDraft';
import { hasUnsavedChanges } from '@/lib/utils/leaveGuard';
import type { AppError, Remote, Viewer } from '@/types/mentor';
import { CalendarScreen } from './CalendarScreen';

vi.mock('next/navigation', () => ({
  usePathname: () => '/calendar',
  useRouter: () => ({ push: vi.fn() }),
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

const remote = <T,>(data: T | null, over: Partial<Remote<T>> = {}): Remote<T> => ({
  data,
  isLoading: false,
  error: null,
  retry: vi.fn(),
  ...over,
});

const monday = () => {
  const days = emptyWeek();
  days[1] = { on: true, slots: [[1020, 1200]] };
  return days;
};
const HOURS: WeeklyHours = {
  days: monday(),
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
  requiresApproval: true,
  maxWindowDays: 56,
};

let weekly: Remote<WeeklyHours>;
let defaults: Remote<MentorDefaults> & { refreshing: boolean };
const saveHours = vi.fn();
let saveHoursError: AppError | null = null;
const saveDefaults = vi.fn();
vi.mock('@/lib/api/data/weeklyHours', () => ({
  useWeeklyHours: () => weekly,
  useSaveWeeklyHours: () => ({
    save: saveHours,
    isPending: false,
    error: saveHoursError,
    reset: vi.fn(),
  }),
}));
vi.mock('@/lib/api/data/sessionTypes', () => ({
  useMentorDefaults: () => defaults,
  useSaveMentorDefaults: () => ({
    save: saveDefaults,
    isPending: false,
    error: null,
    reset: vi.fn(),
  }),
}));
vi.mock('@/lib/api/data/calendar', () => ({
  useBookedDays: () => remote<string[]>([]),
  useBlockedDays: () => remote<string[]>([]),
}));

const mentor = (over: Partial<Extract<Viewer, { kind: 'member' }>> = {}): Viewer => ({
  kind: 'member',
  id: 'm1',
  firstName: 'Gbenga',
  initial: 'G',
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
  ...over,
});

beforeEach(() => {
  viewer = mentor();
  weekly = remote(HOURS);
  defaults = { ...remote(DEFAULTS), refreshing: false };
  saveHours.mockReset().mockResolvedValue(undefined);
  saveDefaults.mockReset().mockResolvedValue(DEFAULTS);
  saveHoursError = null;
});

const tuesdaySwitch = () => screen.getByRole('switch', { name: 'Tuesday' });

describe('CalendarScreen', () => {
  it('shows the hours, the window summary and the listed mentor as available', () => {
    render(<CalendarScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Your calendar' })).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(
      screen.getByText(
        '60 min sessions · at least 24 hours notice · up to 8 weeks ahead · 15 min break',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('3 hrs a week · 1 day')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Unsaved changes' })).toBeNull();
  });

  it('collects edits in a draft: the save bar appears, and Discard puts the saved hours back', async () => {
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(tuesdaySwitch());
    expect(screen.getByRole('region', { name: 'Unsaved changes' })).toBeInTheDocument();
    expect(hasUnsavedChanges()).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.queryByRole('region', { name: 'Unsaved changes' })).toBeNull();
    expect(tuesdaySwitch()).toHaveAttribute('aria-checked', 'false');
    expect(hasUnsavedChanges()).toBe(false);
  });

  it('turning a change back by hand is not a change', async () => {
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(tuesdaySwitch());
    await user.click(tuesdaySwitch());
    expect(screen.queryByRole('region', { name: 'Unsaved changes' })).toBeNull();
  });

  it('saves the draft in the shown zone', async () => {
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(tuesdaySwitch());
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(saveHours).toHaveBeenCalledTimes(1);
    const arg = saveHours.mock.calls[0]![0];
    expect(arg.timeZone).toBe('Africa/Lagos');
    expect(arg.days[2].on).toBe(true);
    expect(arg.current).toBe(HOURS);
  });

  it('won’t save hours that end before they start, and says why', async () => {
    const user = userEvent.setup();
    render(<CalendarScreen />);
    const monday = screen.getByRole('group', { name: 'Monday' });
    await user.selectOptions(within(monday).getByRole('combobox', { name: /end time/i }), '540');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(saveHours).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Fix the hours marked in red, then save.');
  });

  it('a failed save keeps the edits and says so', async () => {
    saveHoursError = { kind: 'server', message: 'Your hours didn’t save. Try again in a moment.' };
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(tuesdaySwitch());
    expect(screen.getByRole('alert')).toHaveTextContent('Your hours didn’t save.');
    expect(tuesdaySwitch()).toHaveAttribute('aria-checked', 'true');
  });

  it('opens the scheduling window, saves it with approval unchanged', async () => {
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(screen.getByRole('button', { name: 'Change scheduling window' }));
    const dialog = screen.getByRole('dialog', { name: 'Scheduling window' });
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Minimum notice' }),
      '48',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(saveDefaults).toHaveBeenCalledWith(
      expect.objectContaining({ noticeHours: 48, requiresApproval: true }),
    );
  });

  it('with no hours yet, says what setting them does and isn’t "Available"', () => {
    weekly = remote({ ...HOURS, days: emptyWeek() });
    render(<CalendarScreen />);
    expect(screen.getByText('No hours set')).toBeInTheDocument();
    expect(
      screen.getByText('Mentees can find and book you once you set your weekly hours.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Available')).toBeNull();
  });

  it('an unlisted mentor isn’t shown as available (busy comes with PR 3)', () => {
    viewer = mentor({ isListedMentor: false });
    render(<CalendarScreen />);
    expect(screen.queryByText('Available')).toBeNull();
  });

  it('loads with a skeleton, never "no hours"', () => {
    weekly = remote<WeeklyHours>(null, { isLoading: true });
    render(<CalendarScreen />);
    expect(screen.getByText('Loading your calendar')).toBeInTheDocument();
    expect(screen.queryByText('No hours set')).toBeNull();
  });

  it('a failed load is an error with Try again, checked before empty', async () => {
    const retry = vi.fn();
    weekly = remote<WeeklyHours>(null, { error: { kind: 'server', message: 'x' }, retry });
    const user = userEvent.setup();
    render(<CalendarScreen />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'We couldn’t load your calendar' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('a mentee is told the calendar is for mentors', () => {
    viewer = mentor({ isMentor: false, isApprovedMentor: false, isMentee: true });
    render(<CalendarScreen />);
    expect(
      screen.getByRole('heading', { name: 'Your calendar is for mentors' }),
    ).toBeInTheDocument();
  });

  it('a guest is asked to log in, coming back here', () => {
    viewer = { kind: 'guest' };
    render(<CalendarScreen />);
    expect(
      screen.getAllByRole('link', { name: 'Log in' }).map((a) => a.getAttribute('href')),
    ).toContain('/login?next=%2Fcalendar');
  });
});
