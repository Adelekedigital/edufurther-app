import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    expect(saveVideo).toHaveBeenCalledWith({ provider: 'google_meet', customUrl: null });
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
});
