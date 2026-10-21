import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Blocked, BookedDay } from '@/lib/api/data/calendar';
import type { MentorStatus } from '@/lib/api/data/mentorStatus';
import type { WeeklyHours } from '@/lib/api/data/weeklyHours';
import type { MentorDefaults } from '@/lib/api/data/sessionTypes';
import { emptyWeek } from '@/lib/utils/sessionTypeDraft';
import { hasUnsavedChanges } from '@/lib/utils/leaveGuard';
import { CalendarScreen } from './CalendarScreen';
import {
  announced,
  h,
  HOURS,
  mentor,
  monday,
  remote,
  resetCalendar,
  resetSave,
  saveBlocked,
  saveDefaults,
  saveHours,
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

describe('CalendarScreen', () => {
  it('shows the hours, the booking rules summary and the listed mentor as available', () => {
    render(<CalendarScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Your calendar' })).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(
      screen.getByText(
        'You approve each booking · 60 min · 24 hrs notice · 8 weeks ahead · 15 min buffer',
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
    expect(screen.getByRole('heading', { name: 'Weekly availability' })).toHaveFocus();
  });

  it('Discard moves focus to the hours before the bar goes', async () => {
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(tuesdaySwitch());
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.getByRole('heading', { name: 'Weekly availability' })).toHaveFocus();
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
    h.saveHoursError = {
      kind: 'server',
      message: 'Your hours didn’t save. Try again in a moment.',
    };
    const user = userEvent.setup();
    const { rerender } = render(<CalendarScreen />);
    await user.click(tuesdaySwitch());
    expect(screen.getByText(/We couldn’t save your hours\./)).toBeInTheDocument();
    resetSave.mockClear();
    // Back to the saved hours: the old failure is reset, not shown on the next edit.
    await user.click(tuesdaySwitch());
    expect(resetSave).toHaveBeenCalled();
    h.saveHoursError = null;
    rerender(<CalendarScreen />);
    await user.click(tuesdaySwitch());
    expect(screen.queryByText(/We couldn’t save your hours\./)).toBeNull();
  });

  it('won’t save hours too short for a session, and says why', async () => {
    h.weekly = remote({ ...HOURS, days: shortMonday() });
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(tuesdaySwitch());
    const bar = screen.getByRole('region', { name: 'Unsaved changes' });
    // Calendar v2 scene Invalid hours: said at once, read out by the bar's status, Save off.
    expect(within(bar).getByRole('status')).toHaveTextContent(
      'Fix the hours marked in red, then save.',
    );
    expect(within(bar).getByRole('button', { name: 'Save changes' })).toBeDisabled();
    expect(saveHours).not.toHaveBeenCalled();
  });

  describe('hours fit the shortest session (product, 2026-10-01)', () => {
    const endTimes = () =>
      within(
        within(screen.getByRole('group', { name: 'Monday' })).getByRole('combobox', {
          name: /end time/i,
        }),
      )
        .getAllByRole('option')
        .map((o) => (o as HTMLOptionElement).value);

    it('end times start a default length after the start', () => {
      render(<CalendarScreen />);
      expect(endTimes()[0]).toBe('1080');
    });

    it('a shorter live session type lowers it; a hidden one doesn’t', () => {
      h.ownTypes = {
        data: [
          { durationMin: 30, isLive: true, usesOwnWindows: false },
          { durationMin: 45, isLive: false, usesOwnWindows: false },
        ],
      };
      render(<CalendarScreen />);
      expect(endTimes()[0]).toBe('1050');
    });

    it('a shorter type with its own windows doesn’t lower it (#146)', () => {
      h.ownTypes = { data: [{ durationMin: 30, isLive: true, usesOwnWindows: true }] };
      render(<CalendarScreen />);
      expect(endTimes()[0]).toBe('1080');
    });

    it('a moved start moves the slot, keeping its length (design setFrom)', async () => {
      const user = userEvent.setup();
      render(<CalendarScreen />);
      const monday = screen.getByRole('group', { name: 'Monday' });
      await user.selectOptions(
        within(monday).getByRole('combobox', { name: /start time/i }),
        '1200',
      );
      // 5–8 pm moved to start at 8 pm stays three hours: 8–11 pm.
      expect(within(monday).getByRole('combobox', { name: /end time/i })).toHaveValue('1380');
    });

    it('saved hours shorter than a session say why under the slot', () => {
      h.weekly = remote({ ...HOURS, days: shortMonday() });
      render(<CalendarScreen />);
      const end = within(screen.getByRole('group', { name: 'Monday' })).getByRole('combobox', {
        name: /end time/i,
      });
      expect(end).toHaveValue('1050');
      expect(end).toHaveAccessibleDescription(
        'Too short for your 60-min sessions. Make it at least 60 min.',
      );
    });
  });

  it('a failed save keeps the edits and says so', async () => {
    h.saveHoursError = {
      kind: 'server',
      message: 'Your hours didn’t save. Try again in a moment.',
    };
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

  it('opens Booking rules and saves the rules with approval as set there', async () => {
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(screen.getByRole('button', { name: 'Edit booking rules' }));
    const dialog = screen.getByRole('dialog', { name: 'Booking rules' });
    expect(dialog).toHaveAccessibleDescription(
      'Your default rules for every session. You can customize them for a single session.',
    );
    const approve = within(dialog).getByRole('switch', { name: 'Approve bookings' });
    expect(approve).toBeChecked();
    await user.click(approve);
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Minimum notice' }),
      '48',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(saveDefaults).toHaveBeenCalledWith(
      expect.objectContaining({ noticeHours: 48, requiresApproval: false }),
    );
    expect(await screen.findByText('Your booking rules are saved.')).toBeInTheDocument();
  });

  it('a failed booking rules save is read out', async () => {
    saveDefaults.mockRejectedValue({
      message: 'Your preferences didn’t save. Try again in a moment.',
    });
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(screen.getByRole('button', { name: 'Edit booking rules' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(announced()).toContain('Your preferences didn’t save. Try again in a moment.'),
    );
  });

  it('Booking rules can’t be closed while its save is on its way', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<CalendarScreen />);
    await user.click(screen.getByRole('button', { name: 'Edit booking rules' }));
    h.defaultsPending = true;
    rerender(<CalendarScreen />);
    const dialog = screen.getByRole('dialog', { name: 'Booking rules' });
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog', { name: 'Booking rules' })).toBeInTheDocument();
  });

  it('with no hours yet, says what setting them does and isn’t "Available"', () => {
    h.weekly = remote({ ...HOURS, days: emptyWeek() });
    render(<CalendarScreen />);
    expect(screen.getByText('No hours set')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Your availability isn’t set yet. Add your weekly hours so mentees can find and book you.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Available')).toBeNull();
  });

  it('an admin-unlisted mentor sees no status, and the notice says why with Contact support', () => {
    h.status = remote<MentorStatus>({
      approved: true,
      listed: false,
      pausedByMentor: false,
      returnOn: null,
    });
    render(<CalendarScreen />);
    expect(screen.queryByText('Available')).toBeNull();
    expect(screen.queryByRole('switch', { name: /Available|Busy/ })).toBeNull();
    const notice = screen.getByText('Unlisted by EduFurther').closest('p')!;
    expect(notice).toHaveTextContent(
      'Unlisted by EduFurther EduFurther has taken your profile off the listing for now, so mentees can’t find or book you, and you can’t switch to available or busy yourself. Contact support if you have questions.',
    );
    const href = within(notice)
      .getByRole('link', { name: 'Contact support' })
      .getAttribute('href')!;
    const url = new URL(href);
    expect(url.protocol).toBe('mailto:');
    expect(url.pathname).toBe('support@edufurther.org');
    expect(url.searchParams.get('subject')).toBe('My profile was unlisted (Gbenga)');
    expect(url.searchParams.get('body')).toContain('taken off the listing');
  });

  // Pending and declined applicants are off the listing too (backend: approval_status
  // decides it), and must never read as unlisted by an admin.
  it('no unlisted notice for an applicant still in review or declined', () => {
    for (const approved of [false]) {
      h.status = remote<MentorStatus>({
        approved,
        listed: false,
        pausedByMentor: false,
        returnOn: null,
      });
      const { unmount } = render(<CalendarScreen />);
      expect(screen.queryByText('Unlisted by EduFurther')).toBeNull();
      unmount();
    }
  });

  it('no unlisted notice for a listed mentor, or one who paused themselves', () => {
    const { unmount } = render(<CalendarScreen />);
    expect(screen.queryByText('Unlisted by EduFurther')).toBeNull();
    unmount();
    h.status = remote<MentorStatus>({
      approved: true,
      listed: false,
      pausedByMentor: true,
      returnOn: null,
    });
    render(<CalendarScreen />);
    expect(screen.queryByText('Unlisted by EduFurther')).toBeNull();
  });

  it('loads with a skeleton, never "no hours"', () => {
    h.weekly = remote<WeeklyHours>(null, { isLoading: true });
    render(<CalendarScreen />);
    expect(screen.getByRole('status', { name: 'Loading your calendar' })).toBeInTheDocument();
    // The page header stays (Calendar v2 scene Loading).
    expect(screen.getByRole('heading', { level: 1, name: 'Your calendar' })).toBeInTheDocument();
    expect(screen.queryByText('No hours set')).toBeNull();
  });

  it('a failed load is an error with Try again, checked before empty', async () => {
    const retry = vi.fn();
    h.weekly = remote<WeeklyHours>(null, { error: { kind: 'server', message: 'x' }, retry });
    const user = userEvent.setup();
    render(<CalendarScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Your calendar' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'We couldn’t load your calendar' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('waits for the session types before offering the hours (#147)', () => {
    h.ownTypes = { data: null, isLoading: true };
    render(<CalendarScreen />);
    expect(screen.getByRole('status', { name: 'Loading your calendar' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Monday' })).toBeNull();
  });

  it('a failed refresh after the types loaded keeps the editor and its draft', () => {
    h.ownTypes = { data: [], error: { kind: 'server', message: 'x' } };
    render(<CalendarScreen />);
    expect(screen.getByRole('group', { name: 'Monday' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'We couldn’t load your calendar' })).toBeNull();
  });

  it('session types that fail to load are an error with Try again, never the editor (#147)', async () => {
    const retry = vi.fn();
    h.ownTypes = { data: null, error: { kind: 'server', message: 'x' }, retry };
    const user = userEvent.setup();
    render(<CalendarScreen />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'We couldn’t load your calendar' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Monday' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('a failed booking rules load is an error too, not an endless skeleton', () => {
    h.defaults = {
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
    h.booked = remote<BookedDay[]>(null, { error: { kind: 'server', message: 'x' }, retry });
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
    h.blocked = remote<Blocked>({ days: ['2099-10-12', '2099-10-13'], exceptions: [] });
    const user = userEvent.setup();
    render(<CalendarScreen />);
    expect(screen.getByText('2 blocked dates')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Blocked dates (2)' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Unblock Mon, Oct 12' }));
    expect(saveBlocked.mock.calls[0]![0].wanted).toEqual(['2099-10-13']);
    await waitFor(() => expect(announced()).toContain('Mon, Oct 12 is open again.'));
  });

  it('a failed unblock keeps the chip and says why, on screen and out loud', async () => {
    h.blocked = remote<Blocked>({ days: ['2099-10-12'], exceptions: [] });
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
    h.blocked = remote<Blocked>({ days: ['2099-10-12', '2099-10-13'], exceptions: [] });
    h.blockedPending = true;
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(screen.getByRole('button', { name: 'Unblock Tue, Oct 13' }));
    await user.click(screen.getByRole('button', { name: 'Blocked dates (2)' }));
    expect(saveBlocked).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Block out dates' })).toBeNull();
  });

  it('a failed modal save keeps the modal open and says why', async () => {
    h.blockedError = { kind: 'server', message: 'We couldn’t save your blocked dates. Try again.' };
    saveBlocked.mockRejectedValue(h.blockedError);
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
    h.blockedPending = true;
    rerender(<CalendarScreen />);
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog', { name: 'Block out dates' })).toBeInTheDocument();
  });

  it('a guest is asked to log in, coming back here', () => {
    h.viewer = { kind: 'guest' };
    render(<CalendarScreen />);
    expect(
      screen.getAllByRole('link', { name: 'Log in' }).map((a) => a.getAttribute('href')),
    ).toContain('/login?next=%2Fcalendar');
  });
});
