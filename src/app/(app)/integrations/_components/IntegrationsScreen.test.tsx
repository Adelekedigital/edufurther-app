import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CalendarConnection } from '@/lib/api/data/calendarConnection';
import type { Conferencing } from '@/lib/api/data/conferencing';
import type { AppError, Remote, Viewer } from '@/types/mentor';
import { IntegrationsScreen } from './IntegrationsScreen';
import {
  expectLockedPage,
  expectNoLock,
  explainer,
  flags,
  resetFlags,
  viewers,
} from '@/app/_shell/lockedPage.harness';

vi.mock('next/navigation', () => ({
  usePathname: () => '/integrations',
  useRouter: () => ({ push: vi.fn() }),
}));

let viewer: Viewer;
// The setup lock's flags, switchable per test (lockedPage.harness).
vi.mock('@/lib/config/auth', async (orig) =>
  (await import('@/app/_shell/lockedPage.harness')).authFlags(await orig()),
);
vi.mock('@/app/_shell/useAppShell', async () => {
  const { accessFor } = await import('@/lib/utils/access');
  return {
    useAppShell: () => ({
      access: accessFor(viewer),
      viewer,
      member: viewer.kind === 'member' ? viewer : null,
      chrome: viewer.kind === 'guest' ? 'guest' : 'member',
      account: undefined,
      nav: viewer.kind === 'member' && viewer.isMentor ? 'mentor' : 'unknown',
    }),
  };
});

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
let connectUnavailable = false;
vi.mock('@/app/_shell/useCalendarConnect', () => ({
  useCalendarConnect: () => ({
    state: connectState,
    connect: connectFn,
    unavailable: connectUnavailable,
    dismiss: vi.fn(),
  }),
}));

let interest: { data: { available: boolean; features: string[] } | null };
const registerFn = vi.fn();
let registerPending = false;
let registerError: AppError | null = null;
vi.mock('@/lib/api/data/interest', () => ({
  // Honours the user argument: the screen passes null until #365 lands, and a
  // mock that ignored it would assert a button the page cannot render.
  useInterest: (userId: string | null) => ({
    data: userId ? interest.data : null,
    isLoading: false,
    error: null,
    retry: vi.fn(),
  }),
  useRegisterInterest: () => ({
    register: registerFn,
    isPending: registerPending,
    error: registerError,
    reset: vi.fn(),
  }),
}));

const connection = (over: Partial<CalendarConnection> = {}): CalendarConnection => ({
  connectedAt: '2026-10-01T09:00:00Z',
  status: 'active',
  lastSyncedAt: null,
  fault: null,
  accountEmail: 'team@edufurther.com',
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
  resetFlags();
  saveVideo.mockReset().mockResolvedValue(undefined);
  savePending = false;
  saveError = null;
  calendar = remote<CalendarConnection | null>(null);
  disconnectFn.mockReset().mockResolvedValue(undefined);
  disconnectPending = false;
  disconnectError = null;
  connectFn.mockReset();
  connectState = { kind: 'idle' };
  connectUnavailable = false;
  interest = { data: { available: true, features: [] } };
  registerFn.mockReset().mockResolvedValue(undefined);
  registerPending = false;
  registerError = null;
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
    video = remote<Conferencing>(null, {
      error: { kind: 'server', message: 'x' } as AppError,
      retry,
    });
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

  it('shows no status line on either provider', () => {
    render(<IntegrationsScreen />);
    expect(screen.queryByText('Ready to use')).not.toBeInTheDocument();
    expect(screen.queryByText('Used for new bookings')).not.toBeInTheDocument();
  });

  /** PRD decision 3: the design's "won't count" line is false. */
  it('says a Meet session counts at its booked length', () => {
    render(<IntegrationsScreen />);
    expect(screen.getByText(/counts at its booked length/)).toBeInTheDocument();
    expect(screen.queryByText(/won’t count toward your session analytics/)).not.toBeInTheDocument();
  });

  /**
   * PRD decision 2. Also what replaced the debounce: arrow keys select as they
   * move, so a pick that wrote fired one PATCH per keystroke (PR 174 review).
   * A pick now only asks, and asking takes focus out of the group.
   */
  it('asks before switching and saves nothing until it is answered', async () => {
    render(<IntegrationsScreen />);
    await userEvent.click(screen.getByRole('radio', { name: /Google Meet/ }));
    expect(saveVideo).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog', { name: 'Switch to Google Meet?' })).toBeInTheDocument();
    // The group still shows what the server holds, not the attempted choice.
    expect(screen.getByRole('radio', { name: /EduFurther video/ })).toBeChecked();
  });

  it('switches on confirm and says so', async () => {
    render(<IntegrationsScreen />);
    await userEvent.click(screen.getByRole('radio', { name: /Google Meet/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Switch to Google Meet' }));
    expect(saveVideo).toHaveBeenCalledWith({ provider: 'google_meet', customUrl: null });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Saved. Sessions now run on Google Meet.',
      ),
    );
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('saves nothing when the mentor keeps what they have', async () => {
    render(<IntegrationsScreen />);
    await userEvent.click(screen.getByRole('radio', { name: /Google Meet/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Keep EduFurther video' }));
    expect(saveVideo).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    // The radio the browser moved on click goes back, so the group never
    // shows a choice the server does not hold.
    expect(screen.getByRole('radio', { name: /EduFurther video/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Google Meet/ })).not.toBeChecked();
  });

  /** Both directions, because each names what booked sessions keep. */
  it('says what booked sessions keep when switching back', async () => {
    video = remote(conferencing({ provider: 'google_meet', isDefault: false }));
    render(<IntegrationsScreen />);
    await userEvent.click(screen.getByRole('radio', { name: /EduFurther video/ }));
    const dialog = screen.getByRole('alertdialog', { name: 'Switch to EduFurther video?' });
    expect(dialog).toHaveTextContent('Sessions already confirmed keep their Google Meet link.');
    await userEvent.click(screen.getByRole('button', { name: 'Switch to EduFurther video' }));
    expect(saveVideo).toHaveBeenCalledWith({ provider: 'daily', customUrl: null });
  });

  it('keeps the confirm open and says why when the switch fails', async () => {
    saveVideo.mockRejectedValue({ kind: 'server', message: 'nope' });
    saveError = { kind: 'server', message: 'We couldn’t save your video setting. Try again.' };
    render(<IntegrationsScreen />);
    await userEvent.click(screen.getByRole('radio', { name: /Google Meet/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Switch to Google Meet' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'We couldn’t save your video setting. Try again.',
      ),
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    // Nothing moved: the radio is still on the server's value.
    expect(screen.getByRole('radio', { name: /EduFurther video/ })).toBeChecked();
  });

  it('announces a failed switch, not just a red line', async () => {
    saveVideo.mockRejectedValue({
      kind: 'server',
      message: 'We couldn’t save your video setting. Try again.',
    });
    render(<IntegrationsScreen />);
    await userEvent.click(screen.getByRole('radio', { name: /Google Meet/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Switch to Google Meet' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'We couldn’t save your video setting. Try again.',
      ),
    );
  });

  /**
   * A refetch while the confirm is open can move the server's value onto the
   * provider being offered (another tab, or support). Without the guard the
   * dialog reads "Switch to Google Meet?" from Google Meet, and confirming
   * PATCHes a no-op (edufurtherfe-f5, 2026-10-21).
   */
  it('closes the confirm when the server lands on the provider it was offering', async () => {
    const { rerender } = render(<IntegrationsScreen />);
    await userEvent.click(screen.getByRole('radio', { name: /Google Meet/ }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    video = remote(conferencing({ provider: 'google_meet', isDefault: false }));
    rerender(<IntegrationsScreen />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(saveVideo).not.toHaveBeenCalled();
  });

  /** PRD decision 1: the page no longer offers a personal meeting link. */
  it('offers no way to set a personal meeting link', () => {
    render(<IntegrationsScreen />);
    expect(
      screen.queryByRole('button', { name: 'Use a personal meeting link instead' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows a personal link support set, read-only', () => {
    video = remote(
      conferencing({
        provider: 'custom',
        customUrl: 'https://meet.example.com/room',
        isDefault: false,
      }),
    );
    render(<IntegrationsScreen />);
    expect(screen.getByRole('radio', { name: /Personal meeting link/ })).toBeChecked();
    expect(screen.getByText('https://meet.example.com/room')).toBeInTheDocument();
    expect(screen.getByText(/anyone with an old invite can join/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    // Two alternatives now, so the label above them counts.
    expect(screen.getByText('Other options')).toBeInTheDocument();
  });

  it('lets a mentor on a personal link switch away, one way', async () => {
    video = remote(
      conferencing({
        provider: 'custom',
        customUrl: 'https://meet.example.com/room',
        isDefault: false,
      }),
    );
    render(<IntegrationsScreen />);
    await userEvent.click(screen.getByRole('radio', { name: /EduFurther video/ }));
    // Not "their Google Meet link": this mentor has never been on Meet.
    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'Sessions already confirmed keep your personal meeting link.',
    );
    // Switching away is the one thing on this screen a mentor cannot undo.
    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'You won’t be able to choose it again here, so ask support if you need it back.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Keep personal meeting link' }));
    expect(saveVideo).not.toHaveBeenCalled();
  });

  it('turns a guest away', () => {
    viewer = { kind: 'guest' } as Viewer;
    render(<IntegrationsScreen />);
    expect(screen.getByText('Log in to manage your integrations')).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  describe('Payments', () => {
    it('shows the coming-soon badge', () => {
      render(<IntegrationsScreen />);
      expect(screen.getByText('Coming soon')).toBeInTheDocument();
    });

    it('registers interest and says so, without promising a date', async () => {
      render(<IntegrationsScreen />);
      await userEvent.click(screen.getByRole('button', { name: 'Notify me' }));
      expect(registerFn).toHaveBeenCalledWith('payments');
      await waitFor(() =>
        expect(screen.getByRole('status')).toHaveTextContent(
          'We’ll let you know when paid sessions are ready.',
        ),
      );
      expect(screen.getByRole('status').textContent).not.toMatch(/\d{4}|week|month|soon as/i);
    });

    /**
     * A disabled button leaves the tab order, so the one state it reports is
     * the one a keyboard or screen-reader user cannot reach. The confirmation
     * is a status line, like the Calendars row's "Connected as ...".
     */
    it('confirms with a status line, not a disabled button', () => {
      interest = { data: { available: true, features: ['payments'] } };
      render(<IntegrationsScreen />);
      expect(screen.getByText('We’ll let you know')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /Notify me|let you know/ }),
      ).not.toBeInTheDocument();
    });

    it('offers nothing to press if the endpoint goes away', () => {
      interest = { data: { available: false, features: [] } };
      render(<IntegrationsScreen />);
      expect(screen.getByText('Get paid for sessions')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Notify me' })).not.toBeInTheDocument();
    });

    it('shows the pending line while a sign-up is in flight', () => {
      registerPending = true;
      render(<IntegrationsScreen />);
      expect(screen.getByText('Signing you up…')).toBeInTheDocument();
    });

    it('announces a failure rather than only drawing it', async () => {
      registerFn.mockRejectedValue({ message: 'We couldn’t sign you up just now. Try again.' });
      render(<IntegrationsScreen />);
      await userEvent.click(screen.getByRole('button', { name: 'Notify me' }));
      await waitFor(() =>
        expect(screen.getByRole('status')).toHaveTextContent(
          'We couldn’t sign you up just now. Try again.',
        ),
      );
    });
  });

  describe('Google Calendar', () => {
    it('offers Connect when nothing is connected', async () => {
      render(<IntegrationsScreen />);
      await userEvent.click(screen.getByRole('button', { name: 'Connect' }));
      expect(connectFn).toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: 'Disconnect' })).not.toBeInTheDocument();
    });

    it('names the connected Google account', () => {
      calendar = remote<CalendarConnection | null>(connection());
      render(<IntegrationsScreen />);
      expect(screen.getByText('Connected as team@edufurther.com')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Disconnect' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Connect' })).not.toBeInTheDocument();
    });

    /** `error` means reconnect; a transient failure never sets it (backend #5). */
    it('asks for a reconnect when the grant broke, and says why', () => {
      calendar = remote<CalendarConnection | null>(
        connection({ status: 'error', fault: 'revoked' }),
      );
      render(<IntegrationsScreen />);
      expect(screen.getByText(/Access was removed or has expired/)).toBeInTheDocument();
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
      connectUnavailable = true;
      render(<IntegrationsScreen />);
      expect(screen.getByRole('button', { name: 'Connect' })).toBeDisabled();
      expect(screen.getAllByText(/available yet/).length).toBeGreaterThan(0);
      expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    });

    it('treats a closed consent window as nothing connected, not a failure', () => {
      connectState = { kind: 'nothingConnected' };
      render(<IntegrationsScreen />);
      expect(screen.getByText('Nothing was connected.')).toBeInTheDocument();
      // Google's calendar permission is a separate checkbox; skipping it looks
      // identical to closing the window, so the copy covers both.
      expect(screen.getAllByText(/separate step/).length).toBeGreaterThan(0);
    });

    it('tells the mentor when the browser blocked the popup', () => {
      connectState = { kind: 'blocked' };
      render(<IntegrationsScreen />);
      expect(screen.getAllByText(/blocked the pop-up/).length).toBeGreaterThan(0);
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
      const dialog = screen.getByRole('alertdialog');
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
      const dialog = screen.getByRole('alertdialog');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Disconnect' }));
      await waitFor(() =>
        expect(
          screen.getByText('We couldn’t disconnect Google Calendar. Try again.'),
        ).toBeInTheDocument(),
      );
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    /** Null is "not known" — a grant older than the widened consent. */
    it('falls back to "Connected" when the account cannot be known', () => {
      calendar = remote<CalendarConnection | null>(connection({ accountEmail: null }));
      render(<IntegrationsScreen />);
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.queryByText(/Connected as/)).not.toBeInTheDocument();
    });

    /** Connecting again replaces the grant — the backend's own words. */
    it('offers a working connection a way to switch account', async () => {
      calendar = remote<CalendarConnection | null>(connection());
      render(<IntegrationsScreen />);
      await userEvent.click(screen.getByRole('button', { name: 'Use a different account' }));
      expect(connectFn).toHaveBeenCalled();
    });

    it('does not offer it where no calendar client is configured', () => {
      calendar = remote<CalendarConnection | null>(connection());
      connectUnavailable = true;
      render(<IntegrationsScreen />);
      expect(screen.getByRole('button', { name: 'Use a different account' })).toBeDisabled();
    });

    /** A broken grant already has Reconnect, which picks the account anyway. */
    it('does not duplicate Reconnect when the grant is broken', () => {
      calendar = remote<CalendarConnection | null>(
        connection({ status: 'error', fault: 'revoked' }),
      );
      render(<IntegrationsScreen />);
      expect(screen.getByRole('button', { name: 'Reconnect' })).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Use a different account' }),
      ).not.toBeInTheDocument();
    });

    /** Review of #179: React Query keeps `data` through a failed refetch. */
    it('keeps Connected and Disconnect when a refetch blips', () => {
      calendar = remote<CalendarConnection | null>(connection(), {
        error: { kind: 'offline', message: 'x' } as AppError,
      });
      render(<IntegrationsScreen />);
      expect(screen.getByText(/^Connected as /)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Disconnect' })).toBeInTheDocument();
      expect(
        screen.queryByText(/couldn’t check whether your calendar is connected/),
      ).not.toBeInTheDocument();
    });

    /** `busy` on a Button is cursor-only, so a 3-minute wait looked like nothing. */
    it('says it is waiting on Google while the consent is open', () => {
      connectState = { kind: 'busy' };
      render(<IntegrationsScreen />);
      expect(screen.getByText(/Waiting for Google/)).toBeInTheDocument();
    });

    it('announces a connect outcome rather than only drawing it', async () => {
      connectState = { kind: 'nothingConnected' };
      render(<IntegrationsScreen />);
      // The Notice is its own role="status"; the assertion is that the
      // page-level live region carries it too, since a region inserted with
      // its text already in it is the one screen readers skip.
      await waitFor(() =>
        expect(
          screen
            .getAllByRole('status')
            .map((n) => n.textContent ?? '')
            .join(' '),
        ).toContain('the calendar permission wasn’t ticked'),
      );
    });

    it('does not contradict a connection that arrived after the poll gave up', () => {
      connectState = { kind: 'nothingConnected' };
      calendar = remote<CalendarConnection | null>(connection());
      render(<IntegrationsScreen />);
      expect(screen.getByText(/^Connected as /)).toBeInTheDocument();
      expect(screen.queryByText('Nothing was connected.')).not.toBeInTheDocument();
    });

    it('announces a failed disconnect and keeps the dialog', async () => {
      calendar = remote<CalendarConnection | null>(connection());
      disconnectFn.mockRejectedValue({
        kind: 'server',
        message: 'We couldn’t disconnect Google Calendar. Try again.',
      });
      render(<IntegrationsScreen />);
      await userEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
      const dialog = screen.getByRole('alertdialog');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Disconnect' }));
      await waitFor(() =>
        expect(screen.getByRole('status')).toHaveTextContent(
          'We couldn’t disconnect Google Calendar. Try again.',
        ),
      );
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    /** The Disconnect button is removed by the commit that closes the modal. */
    it('moves focus to Connect after a successful disconnect', async () => {
      calendar = remote<CalendarConnection | null>(connection());
      const { rerender } = render(<IntegrationsScreen />);
      await userEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
      const dialog = screen.getByRole('alertdialog');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Disconnect' }));
      await waitFor(() => expect(disconnectFn).toHaveBeenCalled());
      calendar = remote<CalendarConnection | null>(null);
      rerender(<IntegrationsScreen />);
      await waitFor(() => expect(screen.getByRole('button', { name: 'Connect' })).toHaveFocus());
    });

    /** One section failing must not hide the other's working controls. */
    it('keeps the calendar row when the video setting fails to load', () => {
      video = remote<Conferencing>(null, { error: { kind: 'server', message: 'x' } as AppError });
      calendar = remote<CalendarConnection | null>(connection());
      render(<IntegrationsScreen />);
      expect(screen.getByRole('button', { name: 'Disconnect' })).toBeInTheDocument();
      expect(screen.getByText(/couldn’t load your video for sessions/)).toBeInTheDocument();
      expect(screen.queryByText('We couldn’t load your integrations')).not.toBeInTheDocument();
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

describe('the setup lock: /integrations opened by URL (PRD "App shell and access")', () => {
  it('a declined mentor gets the explainer as the page, not their integrations', () => {
    viewer = viewers.mentorDeclined;
    render(<IntegrationsScreen />);
    expectLockedPage(explainer.mentorNotApproved('Integration'));
    expect(screen.queryByRole('heading', { name: 'Integrations' })).toBeNull();
  });

  // A mentee never reaches the screen: the layout redirects them (RoleRedirect.test).
  it.each([
    [
      'a mentor who never sent their application',
      viewers.mentorUnfinished,
      explainer.mentorSetup('Integration'),
    ],
    ['a mentor sign-up, not started', viewers.mentorSignup, explainer.mentorSetup('Integration')],
  ])('%s gets the setup explainer', (_who, v, e) => {
    viewer = v;
    render(<IntegrationsScreen />);
    expectLockedPage(e);
  });

  it.each([
    ['a mentor in review (only Bookings locks)', viewers.mentorReview],
    ['an approved mentor', viewers.mentorApproved],
    ['an approved mentor who hasn’t seen the approved screen', viewers.mentorApprovedUnseen],
  ])('%s sees their integrations', (_who, v) => {
    viewer = v;
    render(<IntegrationsScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Integrations' })).toBeInTheDocument();
    expectNoLock();
  });

  it('while /me loads: the page’s loading state, no explainer', () => {
    viewer = { kind: 'loading', signedIn: true };
    render(<IntegrationsScreen />);
    expect(screen.getByRole('status', { name: 'Loading your integrations' })).toBeInTheDocument();
    expectNoLock();
  });

  it('mentor onboarding switched off: a declined mentor isn’t locked', () => {
    flags.mentor = false;
    viewer = viewers.mentorDeclined;
    render(<IntegrationsScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Integrations' })).toBeInTheDocument();
    expectNoLock();
  });
});
