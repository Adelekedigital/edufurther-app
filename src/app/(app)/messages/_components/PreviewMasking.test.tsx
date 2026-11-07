import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { previewStore, resetPreviewStoreForTests } from '@/lib/api/data/previewStore';
import type { Message } from '@/types/messages';
import { MessagesScreen } from './MessagesScreen';
import {
  ago,
  chatRow,
  h,
  inbox,
  NOW,
  remote,
  resetHarness,
  thread,
} from './messagesScreen.harness';

vi.mock('next/navigation', async () =>
  (await import('./messagesScreen.harness')).mocks.navigation(),
);
vi.mock('@/app/_shell/useAppShell', async () =>
  (await import('./messagesScreen.harness')).mocks.appShell(),
);
vi.mock('@/lib/api/data/messages', async () =>
  (await import('./messagesScreen.harness')).mocks.messages(),
);
vi.mock('@/lib/api/data/messageSend', async () =>
  (await import('./messagesScreen.harness')).chatMocks.messageSend(),
);
vi.mock('@/lib/api/data/messageFiles', async () =>
  (await import('./messagesScreen.harness')).chatMocks.messageFiles(),
);
vi.mock('@/lib/api/data/goals', async () =>
  (await import('./messagesScreen.harness')).chatMocks.goals(),
);
vi.mock('@/lib/api/data/settings', async () =>
  (await import('./messagesScreen.harness')).chatMocks.settings(),
);
// The reveal call is useRevealPreview's (preview.reveal.test): here, what it was given.
const reveal = vi.fn();
vi.mock('@/lib/api/data/preview', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/data/preview')>()),
  useRevealPreview: () => ({ mutate: reveal, isPending: false, isError: false }),
}));

const UJ = 'u-ujunwa';
const AMARA = {
  id: 'u-amara',
  email: 'amara@example.com',
  name: 'Amara Okafor',
  firstName: 'Amara',
  initials: 'AO',
  role: 'mentee' as const,
};
const masked = (id: string, mine: boolean): Message => ({
  id,
  clientId: null,
  mine,
  body: null,
  file: null,
  sentAt: ago(10),
  editedAt: null,
  deleted: false,
  hiddenInPreview: true,
});
const lastMasked = {
  kind: 'text' as const,
  text: null,
  fileName: null,
  mine: false,
  at: ago(10),
  deleted: false,
  hiddenInPreview: true,
};

function previewAs(access: { revealed: boolean; canReveal: boolean }) {
  previewStore.started('ps-1', AMARA, access, '/admin');
}
function openMasked() {
  h.chats = inbox([chatRow({ last: lastMasked })]);
  h.threads[UJ] = remote(thread({ items: [masked('m1', false), masked('m2', true)] }));
  h.search = `with=${UJ}`;
}
const chat = () => within(screen.getByRole('region', { name: /^Chat with/ }));
const list = () => within(screen.getByRole('region', { name: 'Messages' }));

beforeEach(() => {
  resetHarness();
  resetPreviewStoreForTests();
  reveal.mockReset();
  vi.useFakeTimers({ now: NOW, shouldAdvanceTime: true });
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
});
afterEach(() => vi.useRealTimers());

describe('Messages in a preview (Preview as user)', () => {
  it('a masked message shows that it exists, never a body, with Reveal', () => {
    previewAs({ revealed: false, canReveal: true });
    openMasked();
    render(<MessagesScreen />);
    expect(chat().getAllByText('Message hidden in preview')).toHaveLength(2);
    expect(chat().getAllByRole('button', { name: 'Reveal' })).toHaveLength(2);
    // The list's preview is masked too, with no button inside the row's button.
    const row = list().getByRole('button', { name: /Ujunwa Umeokeke/ });
    expect(row).toHaveTextContent('Message hidden in preview');
    expect(within(row).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText('Revealed by you. Your reason was logged.')).not.toBeInTheDocument();
  });

  it('no Reveal without can_reveal', () => {
    previewAs({ revealed: false, canReveal: false });
    openMasked();
    render(<MessagesScreen />);
    expect(chat().getAllByText('Message hidden in preview')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Reveal' })).not.toBeInTheDocument();
  });

  it('Reveal opens the one modal; an empty reason sends nothing, a reason is sent', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    previewAs({ revealed: false, canReveal: true });
    openMasked();
    render(<MessagesScreen />);
    await user.click(chat().getAllByRole('button', { name: 'Reveal' })[0]!);
    const dialog = within(screen.getByRole('dialog', { name: 'Reveal hidden details' }));
    expect(dialog.getByText(/You’ll see Amara’s messages/)).toBeInTheDocument();

    await user.click(dialog.getByRole('button', { name: 'Reveal' }));
    expect(dialog.getByText('Add a reason to reveal.')).toBeInTheDocument();
    expect(reveal).not.toHaveBeenCalled();

    await user.type(dialog.getByRole('textbox', { name: 'Reason' }), 'Ticket 4821');
    await user.click(dialog.getByRole('button', { name: 'Reveal' }));
    expect(reveal).toHaveBeenCalledWith('Ticket 4821', expect.anything());
  });

  it('revealed: the bodies show, with the "Revealed by you" line', () => {
    previewAs({ revealed: true, canReveal: true });
    h.threads[UJ] = remote(
      thread({
        items: [{ ...masked('m1', false), body: 'See you Tuesday.', hiddenInPreview: false }],
      }),
    );
    h.search = `with=${UJ}`;
    render(<MessagesScreen />);
    expect(chat().getByText('See you Tuesday.')).toBeInTheDocument();
    expect(chat().getByText('Revealed by you. Your reason was logged.')).toBeInTheDocument();
    expect(screen.queryByText('Message hidden in preview')).not.toBeInTheDocument();
  });

  it('not previewing: no reveal line, whatever the store says', () => {
    h.search = `with=${UJ}`;
    h.threads[UJ] = remote(thread({ items: [] }));
    render(<MessagesScreen />);
    expect(screen.queryByText('Revealed by you. Your reason was logged.')).not.toBeInTheDocument();
  });
});
