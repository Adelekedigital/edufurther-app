import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Conferencing } from '@/lib/api/data/conferencing';
import { CalendarScreen } from './CalendarScreen';
import { announced, h, remote, resetCalendar, saveVideo } from './calendarScreen.harness';

// The video picker (Calendar v2 PR 2). The data hooks, mocked (hoisted above
// the imports; state lives in the harness).
vi.mock('next/navigation', async () =>
  (await import('./calendarScreen.harness')).mocks.navigation(),
);
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

const openConfirm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Change video for sessions' }));
  await user.click(screen.getByRole('radio', { name: /Google Meet/ }));
  return screen.getByRole('alertdialog', { name: 'Switch to Google Meet?' });
};
const rowControl = () => screen.getByRole('button', { name: 'Change video for sessions' });

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
    h.saveVideoError = {
      kind: 'server',
      message: 'We couldn’t save your video setting. Try again.',
    };
    rerender(<CalendarScreen />);
    const confirm = screen.getByRole('alertdialog', { name: 'Switch to Google Meet?' });
    expect(confirm).toHaveTextContent('We couldn’t save your video setting. Try again.');
    expect(screen.getByText('Video for sessions: EduFurther video')).toBeInTheDocument();
  });

  it('a personal link shows read-only, only when it’s the current choice', async () => {
    h.video = remote<Conferencing>({
      provider: 'custom',
      customUrl: 'https://meet.example.org/gbenga',
      isDefault: true,
    });
    const user = userEvent.setup();
    render(<CalendarScreen />);
    expect(screen.getByText('Video for sessions: Personal meeting link')).toBeInTheDocument();
    // The row says the trade-off in Integrations' words (one wording per concept).
    expect(
      screen.getByText('Every mentee gets the same link, so anyone with an old invite can join.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Change video for sessions' }));
    const dialog = screen.getByRole('dialog', { name: 'Video for sessions' });
    const own = within(dialog).getByRole('radio', { name: /Personal meeting link/ });
    expect(own).toBeChecked();
    expect(within(dialog).getByText('https://meet.example.org/gbenga')).toBeInTheDocument();
  });

  it('Escape on the confirm closes it and focus goes back to the row', async () => {
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await openConfirm(user);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(saveVideo).not.toHaveBeenCalled();
    await waitFor(() => expect(rowControl()).toHaveFocus());
  });

  it('× on the confirm closes it and focus goes back to the row', async () => {
    const user = userEvent.setup();
    render(<CalendarScreen />);
    const confirm = await openConfirm(user);
    await user.click(within(confirm).getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    await waitFor(() => expect(rowControl()).toHaveFocus());
  });

  it('after a failed switch, Keep closes it with the saved provider and focus on the row', async () => {
    saveVideo.mockRejectedValue({ message: 'We couldn’t save your video setting. Try again.' });
    const user = userEvent.setup();
    const { rerender } = render(<CalendarScreen />);
    await openConfirm(user);
    await user.click(screen.getByRole('button', { name: 'Switch to Google Meet' }));
    h.saveVideoError = {
      kind: 'server',
      message: 'We couldn’t save your video setting. Try again.',
    };
    rerender(<CalendarScreen />);
    await user.click(screen.getByRole('button', { name: 'Keep EduFurther video' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByText('Video for sessions: EduFurther video')).toBeInTheDocument();
    await waitFor(() => expect(rowControl()).toHaveFocus());
  });

  // A refetch (window focus, another tab) can move the saved provider under an
  // open confirm; "Switch to Google Meet" from Google Meet would save nothing.
  it('a refetch that lands on the pick closes the confirm instead of asking a no-op', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<CalendarScreen />);
    await openConfirm(user);
    h.video = remote<Conferencing>({ provider: 'google_meet', customUrl: null, isDefault: true });
    act(() => rerender(<CalendarScreen />));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(saveVideo).not.toHaveBeenCalled();
    await waitFor(() => expect(rowControl()).toHaveFocus());
    // The stale pick is dropped, not just hidden: moving back doesn't reopen it.
    h.video = remote<Conferencing>({ provider: 'daily', customUrl: null, isDefault: true });
    act(() => rerender(<CalendarScreen />));
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});
