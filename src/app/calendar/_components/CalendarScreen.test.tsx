import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Blocked, BookedDay } from '@/lib/api/data/calendar';
import type { Conferencing } from '@/lib/api/data/conferencing';
import type { MentorStatus } from '@/lib/api/data/mentorStatus';
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
const resetSave = vi.fn();
let saveHoursError: AppError | null = null;
const saveDefaults = vi.fn();
let defaultsPending = false;
vi.mock('@/lib/api/data/weeklyHours', () => ({
  useWeeklyHours: () => weekly,
  useSaveWeeklyHours: () => ({
    save: saveHours,
    isPending: false,
    error: saveHoursError,
    reset: resetSave,
  }),
}));
vi.mock('@/lib/api/data/sessionTypes', () => ({
  useMentorDefaults: () => defaults,
  useSaveMentorDefaults: () => ({
    save: saveDefaults,
    isPending: defaultsPending,
    error: null,
    reset: vi.fn(),
  }),
}));
let status: Remote<MentorStatus>;
const pause = vi.fn();
const resume = vi.fn();
let pauseError: AppError | null = null;
let resumePending = false;
vi.mock('@/lib/api/data/mentorStatus', () => ({
  useMentorStatus: () => status,
  usePause: () => ({ pause, isPending: false, error: pauseError, reset: vi.fn() }),
  useResume: () => ({ resume, isPending: resumePending, error: null, reset: vi.fn() }),
}));
let video: Remote<Conferencing> & { retrying?: boolean };
const saveVideo = vi.fn();
vi.mock('@/lib/api/data/conferencing', () => ({
  useConferencing: () => video,
  useSaveConferencing: () => ({ save: saveVideo, isPending: false, error: null, reset: vi.fn() }),
}));
let booked: Remote<BookedDay[]>;
let blocked: Remote<Blocked>;
const saveBlocked = vi.fn();
let blockedPending = false;
let blockedError: AppError | null = null;
vi.mock('@/lib/api/data/calendar', () => ({
  useBookedDays: () => booked,
  useBlockedDays: () => blocked,
  useSaveBlockedDays: () => ({
    save: saveBlocked,
    isPending: blockedPending,
    error: blockedError,
    reset: vi.fn(),
  }),
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
  defaultsPending = false;
  resetSave.mockReset();
  booked = remote<BookedDay[]>([]);
  blocked = remote<Blocked>({ days: [], exceptions: [] });
  saveBlocked.mockReset().mockResolvedValue(undefined);
  blockedPending = false;
  blockedError = null;
  status = remote<MentorStatus>({ listed: true, pausedByMentor: false, returnOn: null });
  pause.mockReset().mockResolvedValue(undefined);
  resume.mockReset().mockResolvedValue(undefined);
  pauseError = null;
  resumePending = false;
  video = remote<Conferencing>({ provider: 'daily', customUrl: null, isDefault: true });
  saveVideo.mockReset().mockResolvedValue(undefined);
});

const tuesdaySwitch = () => screen.getByRole('switch', { name: 'Tuesday' });
/** What the page's live region last read out. */
const announced = () =>
  screen
    .getAllByRole('status')
    .map((s) => s.textContent)
    .join(' | ');

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
    // The save resolves once the hours are read back: the draft goes with the bar.
    expect(await screen.findByText('Your weekly hours are saved.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Unsaved changes' })).toBeNull();
    expect(hasUnsavedChanges()).toBe(false);
    // The bar's button went: focus is on the hours, not lost to the page.
    expect(screen.getByRole('heading', { name: 'Weekly hours' })).toHaveFocus();
  });

  it('Discard moves focus to the hours before the bar goes', async () => {
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(tuesdaySwitch());
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.getByRole('heading', { name: 'Weekly hours' })).toHaveFocus();
  });

  it('an edit made while the save is on its way stays (with the bar)', async () => {
    let finish: () => void = () => {};
    saveHours.mockImplementation(() => new Promise<void>((r) => (finish = r)));
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(tuesdaySwitch());
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await user.click(screen.getByRole('switch', { name: 'Thursday' }));
    await act(async () => finish());
    expect(screen.getByRole('switch', { name: 'Thursday' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('region', { name: 'Unsaved changes' })).toBeInTheDocument();
  });

  it('a failed save’s message goes once the hours are back as saved', async () => {
    saveHoursError = { kind: 'server', message: 'Your hours didn’t save. Try again in a moment.' };
    const user = userEvent.setup();
    const { rerender } = render(<CalendarScreen />);
    await user.click(tuesdaySwitch());
    expect(screen.getByText(/We couldn’t save your hours\./)).toBeInTheDocument();
    resetSave.mockClear();
    // Back to the saved hours: the old failure is reset, not shown on the next edit.
    await user.click(tuesdaySwitch());
    expect(resetSave).toHaveBeenCalled();
    saveHoursError = null;
    rerender(<CalendarScreen />);
    await user.click(tuesdaySwitch());
    expect(screen.queryByText(/We couldn’t save your hours\./)).toBeNull();
  });

  it('won’t save hours that end before they start, and says why', async () => {
    const user = userEvent.setup();
    render(<CalendarScreen />);
    const monday = screen.getByRole('group', { name: 'Monday' });
    await user.selectOptions(within(monday).getByRole('combobox', { name: /end time/i }), '540');
    const bar = screen.getByRole('region', { name: 'Unsaved changes' });
    // Calendar v2 scene Invalid hours: said at once, read out by the bar's status, Save off.
    expect(within(bar).getByRole('status')).toHaveTextContent(
      'Fix the hours marked in red, then save.',
    );
    expect(within(bar).getByRole('button', { name: 'Save changes' })).toBeDisabled();
    expect(saveHours).not.toHaveBeenCalled();
  });

  it('a failed save keeps the edits and says so', async () => {
    saveHoursError = { kind: 'server', message: 'Your hours didn’t save. Try again in a moment.' };
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(tuesdaySwitch());
    const bar = screen.getByRole('region', { name: 'Unsaved changes' });
    // Calendar v2 scene Save failed: the edits stay, the message says so, Save becomes Try again.
    expect(within(bar).getByRole('status')).toHaveTextContent(
      'We couldn’t save your hours. Your changes are still here. Try again.',
    );
    expect(within(bar).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
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
    expect(await screen.findByText('Your scheduling window is saved.')).toBeInTheDocument();
  });

  it('a failed scheduling window save is read out', async () => {
    saveDefaults.mockRejectedValue({
      message: 'Your preferences didn’t save. Try again in a moment.',
    });
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(screen.getByRole('button', { name: 'Change scheduling window' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(announced()).toContain('Your preferences didn’t save. Try again in a moment.'),
    );
  });

  it('the scheduling window can’t be closed while its save is on its way', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<CalendarScreen />);
    await user.click(screen.getByRole('button', { name: 'Change scheduling window' }));
    defaultsPending = true;
    rerender(<CalendarScreen />);
    const dialog = screen.getByRole('dialog', { name: 'Scheduling window' });
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog', { name: 'Scheduling window' })).toBeInTheDocument();
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

  it('an admin-unlisted mentor sees no status (they can’t change it)', () => {
    status = remote<MentorStatus>({ listed: false, pausedByMentor: false, returnOn: null });
    render(<CalendarScreen />);
    expect(screen.queryByText('Available')).toBeNull();
  });

  it('loads with a skeleton, never "no hours"', () => {
    weekly = remote<WeeklyHours>(null, { isLoading: true });
    render(<CalendarScreen />);
    expect(screen.getByRole('status', { name: 'Loading your calendar' })).toBeInTheDocument();
    // The page header stays (Calendar v2 scene Loading).
    expect(screen.getByRole('heading', { level: 1, name: 'Your calendar' })).toBeInTheDocument();
    expect(screen.queryByText('No hours set')).toBeNull();
  });

  it('a failed load is an error with Try again, checked before empty', async () => {
    const retry = vi.fn();
    weekly = remote<WeeklyHours>(null, { error: { kind: 'server', message: 'x' }, retry });
    const user = userEvent.setup();
    render(<CalendarScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Your calendar' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'We couldn’t load your calendar' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('a failed scheduling window load is an error too, not an endless skeleton', () => {
    defaults = {
      ...remote<MentorDefaults>(null, { error: { kind: 'server', message: 'x' } }),
      refreshing: false,
    };
    render(<CalendarScreen />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'We couldn’t load your calendar' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Loading your calendar' })).toBeNull();
  });

  it('booked sessions that fail to load leave the month up, with Try again', async () => {
    const retry = vi.fn();
    booked = remote<BookedDay[]>(null, { error: { kind: 'server', message: 'x' }, retry });
    const user = userEvent.setup();
    render(<CalendarScreen />);
    expect(screen.getByText(/We couldn’t load your booked sessions\./)).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /2026|2027/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('with nothing blocked, offers to block dates; the modal saves the picked days', async () => {
    const user = userEvent.setup();
    render(<CalendarScreen />);
    expect(screen.getByText('Away on some days?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Block dates' }));
    const dialog = screen.getByRole('dialog', { name: 'Block out dates' });
    const save = within(dialog).getByRole('button', { name: 'Select dates to block' });
    expect(save).toBeDisabled();
    // Next month's 12th, whatever today is: always in the future.
    await user.click(within(dialog).getByRole('button', { name: 'Next month' }));
    await user.click(within(dialog).getAllByRole('button', { name: /^\w+, \w+ 12(,|$)/ })[0]!);
    await user.click(within(dialog).getByRole('button', { name: 'Block 1 date' }));
    expect(saveBlocked).toHaveBeenCalledTimes(1);
    expect(saveBlocked.mock.calls[0]![0].wanted).toHaveLength(1);
    expect(saveBlocked.mock.calls[0]![0].timeZone).toBe('Africa/Lagos');
    expect(await screen.findByText('Blocked dates saved.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Block out dates' })).toBeNull();
  });

  it('lists blocked days as chips; × unblocks one with no confirm and says so', async () => {
    blocked = remote<Blocked>({ days: ['2099-10-12', '2099-10-13'], exceptions: [] });
    const user = userEvent.setup();
    render(<CalendarScreen />);
    expect(screen.getByText('2 blocked dates')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Blocked dates (2)' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Unblock Mon, Oct 12' }));
    expect(saveBlocked.mock.calls[0]![0].wanted).toEqual(['2099-10-13']);
    await waitFor(() => expect(announced()).toContain('Mon, Oct 12 is open again.'));
  });

  it('a failed unblock keeps the chip and says why, on screen and out loud', async () => {
    blocked = remote<Blocked>({ days: ['2099-10-12'], exceptions: [] });
    saveBlocked.mockRejectedValue({ message: 'We couldn’t save your blocked dates. Try again.' });
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(screen.getByRole('button', { name: 'Unblock Mon, Oct 12' }));
    expect(
      await screen.findByText('We couldn’t save your blocked dates. Try again.', { selector: 'p' }),
    ).toBeInTheDocument();
    expect(announced()).toContain('We couldn’t save your blocked dates. Try again.');
    expect(screen.getByRole('button', { name: 'Unblock Mon, Oct 12' })).toBeInTheDocument();
  });

  it('while a blocked-dates save is on its way, another unblock or the modal waits', async () => {
    blocked = remote<Blocked>({ days: ['2099-10-12', '2099-10-13'], exceptions: [] });
    blockedPending = true;
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(screen.getByRole('button', { name: 'Unblock Tue, Oct 13' }));
    await user.click(screen.getByRole('button', { name: 'Blocked dates (2)' }));
    expect(saveBlocked).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Block out dates' })).toBeNull();
  });

  it('a failed modal save keeps the modal open and says why', async () => {
    blockedError = { kind: 'server', message: 'We couldn’t save your blocked dates. Try again.' };
    saveBlocked.mockRejectedValue(blockedError);
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(screen.getByRole('button', { name: 'Blocked dates' }));
    const dialog = screen.getByRole('dialog', { name: 'Block out dates' });
    expect(
      within(dialog).getByText('We couldn’t save your blocked dates. Try again.'),
    ).toBeInTheDocument();
  });

  it('the block-out modal can’t be closed while its save is on its way', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<CalendarScreen />);
    await user.click(screen.getByRole('button', { name: 'Blocked dates' }));
    blockedPending = true;
    rerender(<CalendarScreen />);
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog', { name: 'Block out dates' })).toBeInTheDocument();
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

describe('CalendarScreen: busy and video', () => {
  it('switching off asks when they’ll be back; Set as busy pauses with that date', async () => {
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(screen.getByRole('switch', { name: 'Available for new bookings' }));
    const dialog = screen.getByRole('dialog', { name: 'When will you be back?' });
    expect(within(dialog).getByRole('button', { name: 'Set as busy' })).toBeDisabled();
    await user.click(within(dialog).getByRole('radio', { name: 'Not sure yet' }));
    await user.click(within(dialog).getByRole('button', { name: 'Set as busy' }));
    expect(pause).toHaveBeenCalledWith({ returnOn: null });
    expect(await screen.findByRole('dialog', { name: 'Availability updated' })).toHaveTextContent(
      'See you soon, Gbenga',
    );
    expect(
      screen.getByText('You’re set as busy until you switch yourself back to available.'),
    ).toBeInTheDocument();
  });

  it('while busy: the break card replaces the editing; I’m back resumes', async () => {
    status = remote<MentorStatus>({ listed: false, pausedByMentor: true, returnOn: '2099-10-16' });
    const user = userEvent.setup();
    render(<CalendarScreen />);
    expect(screen.getByText('Busy')).toBeInTheDocument();
    expect(screen.getByText('Back Fri, Oct 16')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'You’re taking a break' })).toBeInTheDocument();
    expect(
      screen.getByText(/We’ll remind you on Fri, Oct 16 to switch back\./),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Weekly hours' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'I’m back, set me available' }));
    expect(resume).toHaveBeenCalled();
    await waitFor(() => expect(announced()).toContain('You’re available again.'));
  });

  it('Change return date opens the modal again', async () => {
    status = remote<MentorStatus>({ listed: false, pausedByMentor: true, returnOn: null });
    const user = userEvent.setup();
    render(<CalendarScreen />);
    expect(screen.getByText('No return date')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Change return date' }));
    expect(screen.getByRole('dialog', { name: 'When will you be back?' })).toBeInTheDocument();
  });

  it('a failed pause keeps the modal open and says why', async () => {
    pauseError = {
      kind: 'server',
      status: 409,
      message:
        'Your profile was taken off the listing by EduFurther, so you can’t change this yourself. Contact support.',
    };
    pause.mockRejectedValue(pauseError);
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(screen.getByRole('switch', { name: 'Available for new bookings' }));
    const dialog = screen.getByRole('dialog', { name: 'When will you be back?' });
    expect(within(dialog).getByText(/taken off the listing by EduFurther/)).toBeInTheDocument();
  });

  it('shows where sessions run and saves a new provider; no Zoom', async () => {
    const user = userEvent.setup();
    render(<CalendarScreen />);
    expect(screen.getByText('Sessions run on EduFurther video')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Change video for sessions' }));
    const dialog = screen.getByRole('dialog', { name: 'Video for sessions' });
    expect(within(dialog).queryByText(/Zoom/)).toBeNull();
    await user.click(within(dialog).getByRole('radio', { name: /Google Meet/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(saveVideo).toHaveBeenCalledWith({ provider: 'google_meet', customUrl: null });
    await waitFor(() => expect(announced()).toContain('Your video setting is saved.'));
  });

  it('waits for the status before choosing editing or the break card', () => {
    status = remote<MentorStatus>(null, { isLoading: true });
    render(<CalendarScreen />);
    expect(screen.getByRole('status', { name: 'Loading your calendar' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Weekly hours' })).toBeNull();
  });

  it('a status that fails to load is a page error, never the editor', async () => {
    const retry = vi.fn();
    status = remote<MentorStatus>(null, { error: { kind: 'server', message: 'x' }, retry });
    const user = userEvent.setup();
    render(<CalendarScreen />);
    expect(
      screen.getByRole('heading', { name: 'We couldn’t load your calendar' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Weekly hours' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('with unsaved hours, the switch asks to save or discard first', async () => {
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(screen.getByRole('switch', { name: 'Tuesday' }));
    await user.click(screen.getByRole('switch', { name: 'Available for new bookings' }));
    expect(screen.queryByRole('dialog', { name: 'When will you be back?' })).toBeNull();
    const bar = screen.getByRole('region', { name: 'Unsaved changes' });
    expect(within(bar).getByRole('status')).toHaveTextContent(
      'Save or discard your hours first, then set yourself as busy.',
    );
    await waitFor(() =>
      expect(within(bar).getByRole('button', { name: 'Save changes' })).toHaveFocus(),
    );
  });

  it('a failed I’m back says why on screen', async () => {
    status = remote<MentorStatus>({ listed: false, pausedByMentor: true, returnOn: null });
    resume.mockRejectedValue({ message: 'We couldn’t set you as available. Try again.' });
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(screen.getByRole('button', { name: 'I’m back, set me available' }));
    expect(
      await screen.findByText('We couldn’t set you as available. Try again.', { selector: 'p' }),
    ).toBeInTheDocument();
  });

  it('Change return date waits while I’m back is saving', () => {
    status = remote<MentorStatus>({ listed: false, pausedByMentor: true, returnOn: null });
    resumePending = true;
    render(<CalendarScreen />);
    expect(screen.getByRole('button', { name: 'Change return date' })).toBeDisabled();
  });

  it('a passed return date is said as passed, not as a reminder to come', () => {
    status = remote<MentorStatus>({ listed: false, pausedByMentor: true, returnOn: '2000-01-03' });
    render(<CalendarScreen />);
    expect(screen.getByText('Return date passed')).toBeInTheDocument();
    expect(screen.getByText(/Your return date, Mon, Jan 3, has passed\./)).toBeInTheDocument();
  });

  it('a video setting that fails to load offers Try again', async () => {
    const retry = vi.fn();
    video = remote<Conferencing>(null, { error: { kind: 'server', message: 'x' }, retry });
    const user = userEvent.setup();
    render(<CalendarScreen />);
    expect(screen.getByText('We couldn’t load your video setting.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try loading your video setting again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('after Done, focus is on the status switch', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<CalendarScreen />);
    await user.click(screen.getByRole('switch', { name: 'Available for new bookings' }));
    await user.click(screen.getByRole('radio', { name: 'Not sure yet' }));
    await user.click(screen.getByRole('button', { name: 'Set as busy' }));
    status = remote<MentorStatus>({ listed: false, pausedByMentor: true, returnOn: null });
    rerender(<CalendarScreen />);
    await user.click(await screen.findByRole('button', { name: 'Done' }));
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Available for new bookings' })).toHaveFocus(),
    );
  });

  it('already busy with unsaved hours: Change return date still opens', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<CalendarScreen />);
    await user.click(screen.getByRole('switch', { name: 'Tuesday' }));
    // Paused from another tab: the status refetches while the draft stays.
    status = remote<MentorStatus>({ listed: false, pausedByMentor: true, returnOn: null });
    rerender(<CalendarScreen />);
    await user.click(screen.getByRole('button', { name: 'Change return date' }));
    expect(screen.getByRole('dialog', { name: 'When will you be back?' })).toBeInTheDocument();
  });

  it('unsaved and invalid hours: says to fix and save first, focus on the hours', async () => {
    const user = userEvent.setup();
    render(<CalendarScreen />);
    const monday = screen.getByRole('group', { name: 'Monday' });
    await user.selectOptions(within(monday).getByRole('combobox', { name: /end time/i }), '540');
    await user.click(screen.getByRole('switch', { name: 'Available for new bookings' }));
    const bar = screen.getByRole('region', { name: 'Unsaved changes' });
    expect(within(bar).getByRole('status')).toHaveTextContent(
      'Fix the hours marked in red, then save before setting yourself as busy.',
    );
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Weekly hours' })).toHaveFocus(),
    );
  });

  it('a failed I’m back message goes when the return modal opens', async () => {
    status = remote<MentorStatus>({ listed: false, pausedByMentor: true, returnOn: null });
    resume.mockRejectedValue({ message: 'We couldn’t set you as available. Try again.' });
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(screen.getByRole('button', { name: 'I’m back, set me available' }));
    await screen.findByText('We couldn’t set you as available. Try again.', { selector: 'p' });
    await user.click(screen.getByRole('button', { name: 'Change return date' }));
    expect(
      screen.queryByText('We couldn’t set you as available. Try again.', { selector: 'p' }),
    ).toBeNull();
  });

  it('an account zone the browser can’t read falls back, no crash', () => {
    viewer = mentor({ timeZone: 'Not/AZone' });
    status = remote<MentorStatus>({ listed: false, pausedByMentor: true, returnOn: '2099-10-16' });
    render(<CalendarScreen />);
    expect(screen.getByText('Back Fri, Oct 16')).toBeInTheDocument();
  });
});
