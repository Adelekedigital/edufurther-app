import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Conferencing } from '@/lib/api/data/conferencing';
import type { MentorStatus } from '@/lib/api/data/mentorStatus';
import type { MentorDefaults } from '@/lib/api/data/sessionTypes';
import { CalendarScreen } from './CalendarScreen';
import {
  announced,
  brokenGrant,
  h,
  HOURS,
  mentor,
  pause,
  remote,
  resetCalendar,
  resume,
  saveVideo,
  shortMonday,
  tuesdaySwitch,
} from './calendarScreen.harness';

// The data hooks, mocked (hoisted above the imports; state lives in the harness).
vi.mock('next/navigation', async () =>
  (await import('./calendarScreen.harness')).mocks.navigation(),
);
// The setup lock's flags, switchable per test (lockedPage.harness).
vi.mock('@/lib/config/auth', async (orig) =>
  (await import('@/app/_shell/lockedPage.harness')).authFlags(await orig()),
);
vi.mock('@/app/_shell/useAppShell', async () =>
  (await import('./calendarScreen.harness')).mocks.appShell(),
);
vi.mock('@/lib/api/data/weeklyHours', async () =>
  (await import('./calendarScreen.harness')).mocks.weeklyHours(),
);
vi.mock('@/lib/api/data/sessionTypes', async () =>
  (await import('./calendarScreen.harness')).mocks.sessionTypes(),
);
vi.mock('@/lib/api/data/mentorStatus', async () =>
  (await import('./calendarScreen.harness')).mocks.mentorStatus(),
);
vi.mock('@/lib/api/data/conferencing', async () =>
  (await import('./calendarScreen.harness')).mocks.conferencing(),
);
vi.mock('@/lib/api/data/calendar', async () =>
  (await import('./calendarScreen.harness')).mocks.calendar(),
);

vi.mock('@/lib/api/data/calendarConnection', async () =>
  (await import('./calendarScreen.harness')).mocks.calendarConnection(),
);

beforeEach(resetCalendar);

describe('CalendarScreen: busy and video', () => {
  it('switching off asks when they’ll be back; Set as busy pauses with that date', async () => {
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(screen.getByRole('switch', { name: 'Available for new bookings' }));
    const dialog = screen.getByRole('dialog', { name: 'When will you be back?' });
    expect(dialog.className).toMatch(/phoneSheet/);
    expect(within(dialog).getByRole('button', { name: 'Set as busy' })).toBeDisabled();
    await user.click(within(dialog).getByRole('radio', { name: 'Not sure yet' }));
    await user.click(within(dialog).getByRole('button', { name: 'Set as busy' }));
    expect(pause).toHaveBeenCalledWith({ returnOn: null });
    expect((await screen.findByRole('dialog', { name: 'Availability updated' })).className).toMatch(
      /phoneSheet/,
    );
    expect(await screen.findByRole('dialog', { name: 'Availability updated' })).toHaveTextContent(
      'See you soon, Gbenga',
    );
    expect(
      screen.getByText('You’re set as busy until you switch yourself back to available.'),
    ).toBeInTheDocument();
  });

  it('while busy: the break card replaces the editing; I’m back resumes', async () => {
    h.status = remote<MentorStatus>({
      approved: true,
      listed: false,
      pausedByMentor: true,
      returnOn: '2099-10-16',
    });
    const user = userEvent.setup();
    render(<CalendarScreen />);
    expect(screen.getByText('Busy')).toBeInTheDocument();
    expect(screen.getByText('Reminder Fri, Oct 16')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'You’re taking a break' })).toBeInTheDocument();
    expect(
      screen.getByText(/We’ll remind you on Fri, Oct 16 to switch back\./),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Weekly availability' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'I’m back, set me available' }));
    expect(resume).toHaveBeenCalled();
    await waitFor(() => expect(announced()).toContain('You’re available again.'));
  });

  it('Change return date opens the modal again', async () => {
    h.status = remote<MentorStatus>({
      approved: true,
      listed: false,
      pausedByMentor: true,
      returnOn: null,
    });
    const user = userEvent.setup();
    render(<CalendarScreen />);
    expect(screen.getByText('No return date')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Change return date' }));
    expect(screen.getByRole('dialog', { name: 'When will you be back?' })).toBeInTheDocument();
  });

  it('a failed pause keeps the modal open and says why', async () => {
    h.pauseError = {
      kind: 'server',
      status: 409,
      message:
        'Your profile was taken off the listing by EduFurther, so you can’t change this yourself. Contact support.',
    };
    pause.mockRejectedValue(h.pauseError);
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(screen.getByRole('switch', { name: 'Available for new bookings' }));
    const dialog = screen.getByRole('dialog', { name: 'When will you be back?' });
    expect(within(dialog).getByText(/taken off the listing by EduFurther/)).toBeInTheDocument();
  });

  it('waits for the status before choosing editing or the break card', () => {
    h.status = remote<MentorStatus>(null, { isLoading: true });
    render(<CalendarScreen />);
    expect(screen.getByRole('status', { name: 'Loading your calendar' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Weekly availability' })).toBeNull();
  });

  it('a status that fails to load is a page error, never the editor', async () => {
    const retry = vi.fn();
    h.status = remote<MentorStatus>(null, { error: { kind: 'server', message: 'x' }, retry });
    const user = userEvent.setup();
    render(<CalendarScreen />);
    expect(
      screen.getByRole('heading', { name: 'We couldn’t load your calendar' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Weekly availability' })).toBeNull();
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
    h.status = remote<MentorStatus>({
      approved: true,
      listed: false,
      pausedByMentor: true,
      returnOn: null,
    });
    resume.mockRejectedValue({ message: 'We couldn’t set you as available. Try again.' });
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(screen.getByRole('button', { name: 'I’m back, set me available' }));
    expect(
      await screen.findByText('We couldn’t set you as available. Try again.', { selector: 'p' }),
    ).toBeInTheDocument();
  });

  it('Change return date waits while I’m back is saving', () => {
    h.status = remote<MentorStatus>({
      approved: true,
      listed: false,
      pausedByMentor: true,
      returnOn: null,
    });
    h.resumePending = true;
    render(<CalendarScreen />);
    expect(screen.getByRole('button', { name: 'Change return date' })).toBeDisabled();
  });

  it('a passed return date is said as passed, not as a reminder to come', () => {
    h.status = remote<MentorStatus>({
      approved: true,
      listed: false,
      pausedByMentor: true,
      returnOn: '2000-01-03',
    });
    render(<CalendarScreen />);
    expect(screen.getByText('Return date passed')).toBeInTheDocument();
    expect(screen.getByText(/Your return date, Mon, Jan 3, has passed\./)).toBeInTheDocument();
  });

  it('a video setting that fails to load offers Try again', async () => {
    const retry = vi.fn();
    h.video = remote<Conferencing>(null, { error: { kind: 'server', message: 'x' }, retry });
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
    h.status = remote<MentorStatus>({
      approved: true,
      listed: false,
      pausedByMentor: true,
      returnOn: null,
    });
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
    h.status = remote<MentorStatus>({
      approved: true,
      listed: false,
      pausedByMentor: true,
      returnOn: null,
    });
    rerender(<CalendarScreen />);
    await user.click(screen.getByRole('button', { name: 'Change return date' }));
    expect(screen.getByRole('dialog', { name: 'When will you be back?' })).toBeInTheDocument();
  });

  it('unsaved and invalid hours: says to fix and save first, focus on the hours', async () => {
    h.weekly = remote({ ...HOURS, days: shortMonday() });
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(tuesdaySwitch());
    await user.click(screen.getByRole('switch', { name: 'Available for new bookings' }));
    const bar = screen.getByRole('region', { name: 'Unsaved changes' });
    expect(within(bar).getByRole('status')).toHaveTextContent(
      'Fix the hours marked in red, then save before setting yourself as busy.',
    );
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Weekly availability' })).toHaveFocus(),
    );
  });

  it('a failed I’m back message goes when the return modal opens', async () => {
    h.status = remote<MentorStatus>({
      approved: true,
      listed: false,
      pausedByMentor: true,
      returnOn: null,
    });
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
    h.viewer = mentor({ timeZone: 'Not/AZone' });
    h.status = remote<MentorStatus>({
      approved: true,
      listed: false,
      pausedByMentor: true,
      returnOn: '2099-10-16',
    });
    render(<CalendarScreen />);
    expect(screen.getByText('Reminder Fri, Oct 16')).toBeInTheDocument();
  });

  it('booked days load from today, and paging the month further widens the range', async () => {
    const user = userEvent.setup();
    render(<CalendarScreen />);
    const first = h.bookedRange!;
    expect(first.from <= first.to).toBe(true);
    const month = screen.getByRole('heading', { name: 'Month at a glance' }).closest('section')!;
    for (let i = 0; i < 5; i++)
      await user.click(within(month).getByRole('button', { name: 'Next month' }));
    expect(h.bookedRange!.from).toBe(first.from);
    expect(h.bookedRange!.to > first.to).toBe(true);
  });

  it('booked days wait for the hours and the window before loading', () => {
    h.defaults = { ...remote<MentorDefaults>(null, { isLoading: true }), refreshing: false };
    render(<CalendarScreen />);
    expect(h.bookedUser).toBeNull();
  });

  it('booked days count from today in the account’s zone', () => {
    h.viewer = mentor({ timeZone: 'Pacific/Kiritimati' });
    render(<CalendarScreen />);
    expect(h.bookedUser).toBe('m1');
    const kiritimati = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Kiritimati' }).format(
      new Date(),
    );
    expect(h.bookedRange!.from).toBe(kiritimati);
  });
});

/**
 * The reconnect banner's mount (PRD decision 5). Nothing else in these files
 * renders it, so without these the banner could be moved into the wrong
 * branch, or deleted from this screen, and every test would still pass.
 */
describe('CalendarScreen: the Google reconnect banner', () => {
  const reconnect = () => screen.queryByRole('button', { name: 'Reconnect' });

  it('appears for a grant the backend marked broken', () => {
    h.viewer = mentor();
    h.connection = remote(brokenGrant());
    render(<CalendarScreen />);
    expect(reconnect()).toBeInTheDocument();
    expect(
      screen.getByText(/needs reconnecting. Until then, times you’re busy can still be booked/),
    ).toBeInTheDocument();
  });

  it('stays away from a working connection', () => {
    h.viewer = mentor();
    h.connection = remote(brokenGrant({ status: 'active' }));
    render(<CalendarScreen />);
    expect(reconnect()).not.toBeInTheDocument();
  });

  /**
   * "Times you're busy can still be booked" is false while paused: nothing can
   * be booked at all. The banner comes back by itself when they return, which
   * is exactly when the cost becomes real.
   */
  it('stays away while the mentor is paused, where its second sentence is false', () => {
    h.viewer = mentor();
    h.connection = remote(brokenGrant());
    h.status = remote<MentorStatus>({
      approved: true,
      listed: true,
      pausedByMentor: true,
      returnOn: null,
    });
    render(<CalendarScreen />);
    expect(reconnect()).not.toBeInTheDocument();
  });

  /** Same reason: an admin-unlisted mentor cannot be found or booked. */
  it('stays away while EduFurther has unlisted them', () => {
    h.viewer = mentor();
    h.connection = remote(brokenGrant());
    h.status = remote<MentorStatus>({
      approved: true,
      listed: false,
      pausedByMentor: false,
      returnOn: null,
    });
    render(<CalendarScreen />);
    expect(reconnect()).not.toBeInTheDocument();
  });
});
