import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CalendarConnection } from '@/lib/api/data/calendarConnection';
import type { Conferencing } from '@/lib/api/data/conferencing';
import { hasUnsavedChanges } from '@/lib/utils/leaveGuard';
import type { AppError, Remote, Viewer } from '@/types/mentor';
import { IntegrationsScreen } from './IntegrationsScreen';

vi.mock('next/navigation', () => ({
  usePathname: () => '/integrations',
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

let video: Remote<Conferencing> & { retrying?: boolean };
const saveVideo = vi.fn();
let savePending = false;
let saveError: AppError | null = null;
vi.mock('@/lib/api/data/conferencing', () => ({
  useConferencing: () => video,
  useSaveConferencing: () => ({
    save: saveVideo,
    isPending: savePending,
    error: saveError,
    reset: vi.fn(),
  }),
}));

let calendar: Remote<CalendarConnection | null> & { retrying?: boolean };
const disconnectFn = vi.fn();
let disconnectPending = false;
let disconnectError: AppError | null = null;
const connectFn = vi.fn();
let connectState: { kind: string } = { kind: 'idle' };
vi.mock('@/lib/api/data/calendarConnection', () => ({
  useCalendarConnection: () => calendar,
  useDisconnectCalendar: () => ({
    disconnect: disconnectFn,
    isPending: disconnectPending,
    error: disconnectError,
    reset: vi.fn(),
  }),
}));
vi.mock('./useCalendarConnect', () => ({
  useCalendarConnect: () => ({ state: connectState, connect: connectFn, dismiss: vi.fn() }),
}));

const connection = (over: Partial<CalendarConnection> = {}): CalendarConnection => ({
  connectedAt: '2026-10-01T09:00:00Z',
  status: 'active',
  lastSyncedAt: null,
  fault: null,
  ...over,
});

const remote = <T,>(data: T | null, over: Partial<Remote<T>> = {}): Remote<T> => ({
  data,
  isLoading: false,
  error: null,
  retry: vi.fn(),
  ...over,
});

const mentor = (): Viewer => ({ kind: 'member', id: 'm1', isMentor: true }) as Viewer;

const conferencing = (over: Partial<Conferencing> = {}): Conferencing => ({
  provider: 'daily',
  customUrl: null,
  isDefault: true,
  ...over,
});

beforeEach(() => {
  viewer = mentor();
  video = remote(conferencing());
  saveVideo.mockReset().mockResolvedValue(undefined);
  savePending = false;
  saveError = null;
  calendar = remote<CalendarConnection | null>(null);
  disconnectFn.mockReset().mockResolvedValue(undefined);
  disconnectPending = false;
  disconnectError = null;
  connectFn.mockReset();
  connectState = { kind: 'idle' };
});

describe('IntegrationsScreen', () => {
  it('shows the loading state before the setting arrives', () => {
    video = remote<Conferencing>(null, { isLoading: true });
    render(<IntegrationsScreen />);
    expect(screen.getByRole('status', { name: 'Loading your integrations' })).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  it('shows the error state, not an empty one, when the setting fails to load', async () => {
    const retry = vi.fn();
    video = remote<Conferencing>(null, { error: { kind: 'server', message: 'x' } as AppError, retry });
    render(<IntegrationsScreen />);
    expect(screen.getByText('We couldn’t load your integrations')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('renders both providers with the current one chosen', () => {
    video = remote(conferencing({ provider: 'google_meet', isDefault: false }));
    render(<IntegrationsScreen />);
    expect(screen.getByRole('radio', { name: /Google Meet/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /EduFurther video/ })).not.toBeChecked();
  });

  /** Meet is never gated on a Google connection (backend calendar reply #2). */
  it('offers Google Meet without a calendar connection', () => {
    render(<IntegrationsScreen />);
    const meet = screen.getByRole('radio', { name: /Google Meet/ });
    expect(meet).toBeEnabled();
    expect(screen.queryByText(/Connect Google Calendar first/)).not.toBeInTheDocument();
  });

  it('saves the pick and says so', async () => {
    render(<IntegrationsScreen />);
    await userEvent.click(screen.getByRole('radio', { name: /Google Meet/ }));
    // The write is debounced, so arrowing across the group is one PATCH.
    await waitFor(
      () => expect(saveVideo).toHaveBeenCalledWith({ provider: 'google_meet', customUrl: null }),
      { timeout: 3000 },
    );
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Saved. Sessions now run on Google Meet.',
      ),
    );
  });

  it('puts the card back and says why when the save fails', async () => {
    saveVideo.mockRejectedValue({ kind: 'server', message: 'nope' });
    saveError = { kind: 'server', message: 'We couldn’t save your video setting. Try again.' };
    render(<IntegrationsScreen />);
    await userEvent.click(screen.getByRole('radio', { name: /Google Meet/ }));
    await waitFor(() =>
      expect(
        screen.getByText('We couldn’t save your video setting. Try again.'),
      ).toBeInTheDocument(),
    );
    // Back on the server's value rather than stuck on the one that failed.
    expect(screen.getByRole('radio', { name: /EduFurther video/ })).toBeChecked();
  });

  it('refuses a personal link that is not https', async () => {
    render(<IntegrationsScreen />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Use a personal meeting link instead' }),
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Personal meeting link' }),
      'http://meet.example.com/room',
    );
    expect(screen.getByRole('button', { name: 'Use this link' })).toBeDisabled();
    expect(screen.getByText(/starting with https/)).toBeInTheDocument();
    expect(saveVideo).not.toHaveBeenCalled();
  });

  it('saves an https personal link', async () => {
    render(<IntegrationsScreen />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Use a personal meeting link instead' }),
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Personal meeting link' }),
      'https://meet.example.com/room',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Use this link' }));
    expect(saveVideo).toHaveBeenCalledWith({
      provider: 'custom',
      customUrl: 'https://meet.example.com/room',
    });
  });

  it('opens the panel by itself when a personal link is already the choice', () => {
    video = remote(
      conferencing({ provider: 'custom', customUrl: 'https://meet.example.com/room', isDefault: false }),
    );
    render(<IntegrationsScreen />);
    expect(screen.getByRole('textbox', { name: 'Personal meeting link' })).toHaveValue(
      'https://meet.example.com/room',
    );
    expect(screen.getByText('In use for new bookings')).toBeInTheDocument();
  });

  it('guards an unsaved personal link', async () => {
    render(<IntegrationsScreen />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Use a personal meeting link instead' }),
    );
    expect(hasUnsavedChanges()).toBe(false);
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Personal meeting link' }),
      'https://meet.example.com/room',
    );
    expect(hasUnsavedChanges()).toBe(true);
  });

  /** Review of PR 174: the saved link could be seen but never corrected. */
  it('lets a mentor change a personal link they already use', async () => {
    video = remote(
      conferencing({ provider: 'custom', customUrl: 'https://old.example.com/room', isDefault: false }),
    );
    render(<IntegrationsScreen />);
    const field = screen.getByRole('textbox', { name: 'Personal meeting link' });
    expect(screen.getByRole('button', { name: 'Use this link' })).toBeDisabled();
    await userEvent.clear(field);
    await userEvent.type(field, 'https://new.example.com/room');
    const use = screen.getByRole('button', { name: 'Use this link' });
    expect(use).toBeEnabled();
    await userEvent.click(use);
    expect(saveVideo).toHaveBeenCalledWith({
      provider: 'custom',
      customUrl: 'https://new.example.com/room',
    });
  });

  it('clicking the caption focuses the field', async () => {
    render(<IntegrationsScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Use a personal meeting link instead' }));
    await userEvent.click(screen.getByText('Personal meeting link'));
    expect(screen.getByRole('textbox', { name: 'Personal meeting link' })).toHaveFocus();
  });

  it('moves focus into the field when the panel opens, not to the body', async () => {
    render(<IntegrationsScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Use a personal meeting link instead' }));
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Personal meeting link' })).toHaveFocus(),
    );
  });

  /** Arrow keys select as they move, so the write waits for the mentor to settle. */
  it('writes once when the mentor arrows across the group', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      render(<IntegrationsScreen />);
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      await user.click(screen.getByRole('radio', { name: /Google Meet/ }));
      await user.click(screen.getByRole('radio', { name: /EduFurther video/ }));
      await user.click(screen.getByRole('radio', { name: /Google Meet/ }));
      expect(saveVideo).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(400);
      expect(saveVideo).toHaveBeenCalledTimes(1);
      expect(saveVideo).toHaveBeenCalledWith({ provider: 'google_meet', customUrl: null });
    } finally {
      vi.useRealTimers();
    }
  });

  it('announces a failed save, not just a red line', async () => {
    saveVideo.mockRejectedValue({ kind: 'server', message: 'We couldn’t save your video setting. Try again.' });
    saveError = { kind: 'server', message: 'We couldn’t save your video setting. Try again.' };
    render(<IntegrationsScreen />);
    await userEvent.click(screen.getByRole('radio', { name: /Google Meet/ }));
    await waitFor(
      () =>
        expect(screen.getByRole('status')).toHaveTextContent(
          'We couldn’t save your video setting. Try again.',
        ),
      { timeout: 3000 },
    );
  });

  it('keeps the old link in the field after switching away, so it can be put back', async () => {
    video = remote(
      conferencing({ provider: 'custom', customUrl: 'https://old.example.com/room', isDefault: false }),
    );
    const { rerender } = render(<IntegrationsScreen />);
    await userEvent.click(screen.getByRole('radio', { name: /EduFurther video/ }));
    await waitFor(() => expect(saveVideo).toHaveBeenCalled(), { timeout: 3000 });
    // The server has dropped custom_url, as it does for any other provider.
    video = remote(conferencing({ provider: 'daily', customUrl: null, isDefault: false }));
    rerender(<IntegrationsScreen />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Use a personal meeting link instead' }),
    );
    expect(screen.getByRole('textbox', { name: 'Personal meeting link' })).toHaveValue(
      'https://old.example.com/room',
    );
  });

  it('does not leave the page dirty after a pick clears the draft', async () => {
    render(<IntegrationsScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Use a personal meeting link instead' }));
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Personal meeting link' }),
      'https://typed.example.com/room',
    );
    expect(hasUnsavedChanges()).toBe(true);
    await userEvent.click(screen.getByRole('radio', { name: /Google Meet/ }));
    await waitFor(() => expect(hasUnsavedChanges()).toBe(false), { timeout: 3000 });
  });

  it('turns a guest away', () => {
    viewer = { kind: 'guest' } as Viewer;
    render(<IntegrationsScreen />);
    expect(screen.getByText('Log in to manage your integrations')).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  it('turns a signed-in non-mentor away', () => {
    viewer = { kind: 'member', id: 'u1', isMentor: false } as Viewer;
    render(<IntegrationsScreen />);
    expect(screen.getByText('Integrations are for mentors')).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  describe('Google Calendar', () => {
    it('offers Connect when nothing is connected', async () => {
      render(<IntegrationsScreen />);
      await userEvent.click(screen.getByRole('button', { name: 'Connect' }));
      expect(connectFn).toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: 'Disconnect' })).not.toBeInTheDocument();
    });

    it('says it is connected, without naming an account the API never sends', () => {
      calendar = remote<CalendarConnection | null>(connection());
      render(<IntegrationsScreen />);
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Disconnect' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Connect' })).not.toBeInTheDocument();
    });

    /** `error` means reconnect; a transient failure never sets it (backend #5). */
    it('asks for a reconnect when the grant broke, and says why', () => {
      calendar = remote<CalendarConnection | null>(
        connection({ status: 'error', fault: 'revoked' }),
      );
      render(<IntegrationsScreen />);
      expect(screen.getByText(/access was removed or has expired/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reconnect' })).toBeInTheDocument();
    });

    it('falls back to the generic line for a fault it does not know', () => {
      calendar = remote<CalendarConnection | null>(
        connection({ status: 'error', fault: 'unknown' }),
      );
      render(<IntegrationsScreen />);
      expect(screen.getByText('Google Calendar needs reconnecting.')).toBeInTheDocument();
    });

    /** Connect 500s on every environment today (backend #1): say so, never retry. */
    it('stops offering Connect where no calendar client is configured', () => {
      connectState = { kind: 'unavailable' };
      render(<IntegrationsScreen />);
      expect(screen.getByRole('button', { name: 'Connect' })).toBeDisabled();
      expect(screen.getByText(/available yet/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    });

    it('treats a closed consent window as nothing connected, not a failure', () => {
      connectState = { kind: 'nothingConnected' };
      render(<IntegrationsScreen />);
      expect(screen.getByText('Nothing was connected.')).toBeInTheDocument();
    });

    it('tells the mentor when the browser blocked the popup', () => {
      connectState = { kind: 'blocked' };
      render(<IntegrationsScreen />);
      expect(screen.getByText(/blocked the pop-up/)).toBeInTheDocument();
    });

    it('confirms before disconnecting, and drops the design line about Meet', async () => {
      calendar = remote<CalendarConnection | null>(connection());
      render(<IntegrationsScreen />);
      await userEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
      expect(screen.getByText('Disconnect Google Calendar?')).toBeInTheDocument();
      // Meet is never gated on this connection here, so the design's sentence
      // about bookings moving to EduFurther video would be untrue.
      expect(screen.queryByText(/move to EduFurther video/)).not.toBeInTheDocument();
      expect(disconnectFn).not.toHaveBeenCalled();
    });

    it('disconnects on confirm and says so', async () => {
      calendar = remote<CalendarConnection | null>(connection());
      render(<IntegrationsScreen />);
      await userEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
      const dialog = screen.getByRole('dialog');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Disconnect' }));
      expect(disconnectFn).toHaveBeenCalled();
      await waitFor(() =>
        expect(screen.getByRole('status')).toHaveTextContent('Google Calendar disconnected.'),
      );
    });

    it('keeps the confirm open when the disconnect fails', async () => {
      calendar = remote<CalendarConnection | null>(connection());
      disconnectFn.mockRejectedValue({ kind: 'server', message: 'no' });
      disconnectError = {
        kind: 'server',
        message: 'We couldn’t disconnect Google Calendar. Try again.',
      };
      render(<IntegrationsScreen />);
      await userEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
      const dialog = screen.getByRole('dialog');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Disconnect' }));
      await waitFor(() =>
        expect(
          screen.getByText('We couldn’t disconnect Google Calendar. Try again.'),
        ).toBeInTheDocument(),
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('lets the mentor retry when the connection itself failed to load', async () => {
      const retry = vi.fn();
      calendar = remote<CalendarConnection | null>(null, {
        error: { kind: 'server', message: 'x' } as AppError,
        retry,
      });
      render(<IntegrationsScreen />);
      expect(
        screen.getByText(/couldn’t check whether your calendar is connected/),
      ).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
      expect(retry).toHaveBeenCalled();
    });
  });
});
