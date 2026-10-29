import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Message, MessageFile, Thread } from '@/types/messages';
import { MessagesScreen } from './MessagesScreen';
import {
  ago,
  discarded,
  h,
  NOW,
  remote,
  resetHarness,
  sent,
  thread,
  uploaded,
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
// The viewer's own fetch is FileViewerLauncher's (tested there): here, what it was given.
vi.mock('@/app/_shell/FileViewerLauncher', () => ({
  FileViewerLauncher: ({
    file,
    sharedBy,
    onClose,
  }: {
    file: { id: string; name: string; kind: string };
    sharedBy: { mine: boolean; firstName?: string };
    onClose: () => void;
  }) => (
    <div role="dialog" aria-label={file.name}>
      {file.kind}:{file.id}:{sharedBy.mine ? 'you' : sharedBy.firstName}
      <button type="button" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

const UJ = 'u-ujunwa';
const PDF: MessageFile = {
  id: 'f-1',
  name: 'CV.pdf',
  sizeBytes: 240 * 1024,
  contentType: 'application/pdf',
};
let seq = 0;
const msg = (mine: boolean, at: string, body: string | null, over: Partial<Message> = {}) => ({
  id: `m${++seq}`,
  clientId: null,
  mine,
  body,
  file: null,
  sentAt: at,
  editedAt: null,
  deleted: false,
  ...over,
});
const open = (t: Partial<Thread> = {}) => {
  h.threads[UJ] = remote(thread({ items: [msg(false, ago(5), 'Hi')], ...t }));
  h.search = `with=${UJ}`;
};
const chat = () => within(screen.getByRole('region', { name: /^Chat with/ }));
const picker = () =>
  screen
    .getByRole('region', { name: /^Chat with/ })
    .querySelector('input[type=file]') as HTMLInputElement;
const pdfFile = () => new File(['%PDF'], 'CV.pdf', { type: 'application/pdf' });

beforeEach(() => {
  resetHarness();
  vi.useFakeTimers({ now: NOW, shouldAdvanceTime: true });
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
});
afterEach(() => vi.useRealTimers());

describe('attaching a file in the composer', () => {
  it('uploads on pick, shows the chip, and sends the file alone (text optional)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let land: (f: MessageFile) => void = () => {};
    uploaded.mockReturnValue(new Promise<MessageFile>((r) => (land = r)));
    open();
    render(<MessagesScreen />);
    const send = chat().getByRole('button', { name: 'Send' });
    expect(send).toBeDisabled();

    await user.upload(picker(), pdfFile());
    expect(uploaded).toHaveBeenCalledWith(expect.objectContaining({ name: 'CV.pdf' }));
    expect(chat().getByText('Uploading…')).toBeInTheDocument();
    // Mid-upload: Attach is off, and Send says to wait rather than go without the file.
    expect(chat().getByRole('button', { name: 'Attach a file' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await user.click(send);
    expect(chat().getByRole('alert')).toHaveTextContent('Wait for your file to finish uploading.');
    expect(sent).not.toHaveBeenCalled();

    land(PDF);
    expect(await chat().findByRole('button', { name: 'View CV.pdf' })).toBeInTheDocument();
    expect(chat().getByText('240 KB')).toBeInTheDocument();
    expect(chat().queryByRole('alert')).toBeNull();

    await user.click(send);
    expect(sent).toHaveBeenCalledWith({ to: UJ, body: '', file: PDF });
    // The chip leaves with the send; a second press can't send the file again.
    expect(chat().queryByRole('button', { name: 'View CV.pdf' })).toBeNull();
    await user.click(send);
    expect(sent).toHaveBeenCalledTimes(1);
  });

  it('sends text and file together with Enter', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    uploaded.mockResolvedValue(PDF);
    open();
    render(<MessagesScreen />);
    await user.upload(picker(), pdfFile());
    await chat().findByRole('button', { name: 'View CV.pdf' });
    await user.type(chat().getByRole('textbox'), 'My CV{Enter}');
    expect(sent).toHaveBeenCalledWith({ to: UJ, body: 'My CV', file: PDF });
  });

  it('a refused upload says why above the box; nothing is attached', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    uploaded.mockRejectedValue({
      kind: 'validation',
      message: 'That file is over 5 MB. Choose a smaller one.',
    });
    open();
    render(<MessagesScreen />);
    await user.upload(picker(), pdfFile());
    expect(await chat().findByRole('alert')).toHaveTextContent(
      'That file is over 5 MB. Choose a smaller one.',
    );
    expect(chat().queryByRole('button', { name: /^View / })).toBeNull();
    expect(chat().getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('Remove file drops it and puts focus on Attach; View opens it as mine', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    uploaded.mockResolvedValue(PDF);
    open();
    render(<MessagesScreen />);
    await user.upload(picker(), pdfFile());
    await user.click(await chat().findByRole('button', { name: 'View CV.pdf' }));
    expect(screen.getByRole('dialog', { name: 'CV.pdf' })).toHaveTextContent('message:f-1:you');
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.click(chat().getByRole('button', { name: 'Remove file' }));
    expect(chat().queryByRole('button', { name: 'View CV.pdf' })).toBeNull();
    expect(chat().getByRole('button', { name: 'Attach a file' })).toHaveFocus();
  });
});

describe('files in the thread', () => {
  it('a file card per message opens FileViewer, shared by them or by me; a deleted one has none', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    open({
      items: [
        msg(false, ago(30), 'My notes', { file: { ...PDF, id: 'f-th', name: 'Notes.pdf' } }),
        msg(true, ago(20), null, { file: PDF }),
        msg(false, ago(10), null, { deleted: true }),
      ],
    });
    render(<MessagesScreen />);
    const theirs = chat().getByRole('button', { name: 'View Notes.pdf' });
    expect(theirs).toHaveTextContent('240 KB');
    await user.click(theirs);
    expect(screen.getByRole('dialog', { name: 'Notes.pdf' })).toHaveTextContent(
      'message:f-th:Ujunwa',
    );
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.click(chat().getByRole('button', { name: 'View CV.pdf' }));
    expect(screen.getByRole('dialog', { name: 'CV.pdf' })).toHaveTextContent('message:f-1:you');
    expect(chat().getAllByRole('button', { name: /^View / })).toHaveLength(2);
  });

  it('an unsent message shows its file; one refused because the file expired offers Attach it again', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    open();
    h.outbox = [
      {
        clientId: 'c-1',
        to: UJ,
        body: 'Here is my CV',
        file: PDF,
        createdAt: ago(1),
        status: 'failed',
        problem: 'https://edufurther.com/problems/file-unavailable',
      },
    ];
    // The outbox drops it (the next render no longer lists it).
    discarded.mockImplementation(() => {
      h.outbox = [];
    });
    render(<MessagesScreen />);
    expect(chat().getByRole('button', { name: 'View CV.pdf' })).toBeInTheDocument();
    expect(chat().getByText('Not sent. Your file expired.')).toBeInTheDocument();
    expect(chat().queryByRole('button', { name: 'Try again' })).toBeNull();
    await user.click(chat().getByRole('button', { name: 'Attach it again' }));
    expect(discarded).toHaveBeenCalledWith('c-1');
    expect(chat().getByRole('textbox')).toHaveValue('Here is my CV');
    expect(chat().getByRole('alert')).toHaveTextContent('Your file expired. Attach it again.');
    expect(chat().getByRole('button', { name: 'Attach a file' })).toHaveFocus();
  });
});
