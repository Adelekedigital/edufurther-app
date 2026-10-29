import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MessageRecipient, Thread } from '@/types/messages';
import { SendMessageLauncher } from './SendMessageLauncher';

const send = vi.fn();
const retry = vi.fn();
const upload = vi.fn();
let status: {
  data: Partial<Thread> | null;
  isLoading: boolean;
  error: { kind: string; message: string } | null;
  retry: () => void;
};

let outboxItems: {
  clientId: string;
  status: string;
  problem?: string;
  file?: { id: string } | null;
}[] = [];
const discard = vi.fn();
vi.mock('@/lib/api/data/messageSend', () => ({
  useOutbox: () => outboxItems,
  outboxItem: (id: string) => outboxItems.find((i) => i.clientId === id),
  useSendMessage: () => ({
    send: (...a: unknown[]) => send(...a),
    retry: (...a: unknown[]) => retry(...a),
    discard: (...a: unknown[]) => discard(...a),
  }),
}));
vi.mock('@/lib/api/data/messages', () => ({ useChatStatus: () => status }));
vi.mock('@/lib/api/data/messageFiles', () => ({ useUploadMessageFile: () => upload }));
vi.mock('@/app/_shell/FileViewerLauncher', () => ({
  FileViewerLauncher: ({ file }: { file: { name: string; kind: string } }) => (
    <div role="dialog" aria-label={`viewer ${file.kind} ${file.name}`} />
  ),
}));
vi.mock('@/lib/utils/useMediaQuery', () => ({ useMediaQuery: () => false }));

const TO: MessageRecipient = {
  id: 'u-amara',
  name: 'Amara Okafor',
  firstName: 'Amara',
  initials: 'AO',
  avatarUrl: null,
  avatarFocus: null,
  cover: 'rose',
  role: 'mentee',
  institution: null,
};

beforeEach(() => {
  outboxItems = [];
  send.mockReset();
  retry.mockReset();
  discard.mockReset();
  upload.mockReset();
  status = {
    data: { lock: null, sessionWindow: false },
    isLoading: false,
    error: null,
    retry: vi.fn(),
  };
});

const box = () => screen.getByRole('textbox', { name: 'Write to Amara' });
const sendBtn = () => screen.getByRole('button', { name: 'Send message' });

describe('SendMessageLauncher', () => {
  it('closed with no recipient', () => {
    render(<SendMessageLauncher to={null} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('sends into the chat, then says it was sent', async () => {
    send.mockResolvedValue(true);
    render(<SendMessageLauncher to={TO} onClose={vi.fn()} />);
    await userEvent.type(box(), 'Hello');
    await userEvent.click(sendBtn());
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'u-amara',
        body: 'Hello',
        file: null,
        clientId: expect.any(String),
      }),
    );
    expect(await screen.findByRole('dialog', { name: 'Message sent' })).toBeVisible();
  });

  it('a failure, then Send again retries the same message rather than sending a second', async () => {
    send.mockImplementation(async ({ clientId }: { clientId: string }) => {
      outboxItems = [{ clientId, status: 'failed' }];
      return false;
    });
    retry.mockResolvedValue(true);
    render(<SendMessageLauncher to={TO} onClose={vi.fn()} />);
    await userEvent.type(box(), 'Hello');
    await userEvent.click(sendBtn());
    expect(await screen.findByRole('alert')).toHaveTextContent('Not sent.');
    const id = send.mock.calls[0]?.[0].clientId;
    await userEvent.click(sendBtn());
    expect(retry).toHaveBeenCalledWith(id);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('changed text after a failure is a new message', async () => {
    // A false send leaves the message in the outbox, failed (the real outbox).
    send
      .mockImplementationOnce(async ({ clientId }: { clientId: string }) => {
        outboxItems = [{ clientId, status: 'failed' }];
        return false;
      })
      .mockResolvedValueOnce(true);
    render(<SendMessageLauncher to={TO} onClose={vi.fn()} />);
    await userEvent.type(box(), 'Hello');
    await userEvent.click(sendBtn());
    await screen.findByRole('alert');
    await userEvent.type(box(), ' again');
    await userEvent.click(sendBtn());
    expect(retry).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1]?.[0].clientId).not.toBe(send.mock.calls[0]?.[0].clientId);
  });

  it('a locked chat shows its line, not the form (PRD Q7)', () => {
    status = { ...status, data: { lock: 'closed', sessionWindow: false } };
    render(<SendMessageLauncher to={TO} onClose={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Amara closed their account.');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('the session window changes the line', () => {
    status = { ...status, data: { lock: null, sessionWindow: true } };
    render(<SendMessageLauncher to={TO} onClose={vi.fn()} />);
    expect(screen.getByText(/we’ll also email this to Amara right away/)).toBeVisible();
  });

  it('a picked file uploads, is sent with the message, and opens as yours', async () => {
    const file = { id: 'f1', name: 'CV.pdf', sizeBytes: 1000, contentType: 'application/pdf' };
    upload.mockResolvedValue(file);
    send.mockResolvedValue(true);
    const { container } = render(<SendMessageLauncher to={TO} onClose={vi.fn()} />);
    await userEvent.upload(
      container.ownerDocument.querySelector('input[type=file]')!,
      new File(['%PDF'], 'CV.pdf', { type: 'application/pdf' }),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'View CV.pdf' }));
    expect(screen.getByRole('dialog', { name: 'viewer message CV.pdf' })).toBeInTheDocument();
    await userEvent.click(sendBtn());
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ file }));
  });

  it('a file that expired before the send: the file goes, the text stays, the line says why', async () => {
    const file = { id: 'f1', name: 'CV.pdf', sizeBytes: 1000, contentType: 'application/pdf' };
    upload.mockResolvedValue(file);
    send.mockImplementation(async ({ clientId }: { clientId: string }) => {
      outboxItems = [
        { clientId, status: 'failed', problem: 'https://edufurther.com/problems/file-unavailable' },
      ];
      return false;
    });
    const { container } = render(<SendMessageLauncher to={TO} onClose={vi.fn()} />);
    await userEvent.upload(
      container.ownerDocument.querySelector('input[type=file]')!,
      new File(['%PDF'], 'CV.pdf', { type: 'application/pdf' }),
    );
    await screen.findByRole('button', { name: 'View CV.pdf' });
    await userEvent.type(box(), 'My CV');
    await userEvent.click(sendBtn());
    expect(discard).toHaveBeenCalledWith(send.mock.calls[0]?.[0].clientId);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your file expired. Attach it again.',
    );
    expect(screen.queryByRole('button', { name: 'View CV.pdf' })).toBeNull();
    expect(box()).toHaveValue('My CV');
    expect(screen.queryByText(/Not sent/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Attach a file' })).toHaveFocus();
  });

  it('a refused upload says why, and nothing is attached', async () => {
    upload.mockRejectedValue({ kind: 'validation', message: 'Use a PDF or Word (.docx) file.' });
    const { container } = render(<SendMessageLauncher to={TO} onClose={vi.fn()} />);
    await userEvent.upload(
      container.ownerDocument.querySelector('input[type=file]')!,
      new File(['x'], 'a.pdf', { type: 'application/pdf' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Use a PDF or Word (.docx) file.');
    expect(screen.getByRole('button', { name: 'Attach a file' })).not.toHaveAttribute(
      'aria-disabled',
    );
  });

  it('after a send, focus moves into the Sent dialog (Done)', async () => {
    send.mockResolvedValue(true);
    render(<SendMessageLauncher to={TO} onClose={vi.fn()} />);
    await userEvent.type(box(), 'Hello');
    await userEvent.click(sendBtn());
    await screen.findByRole('dialog', { name: 'Message sent' });
    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Done' })).toHaveFocus());
  });

  it('offline: waiting, not failed, and Sent once the outbox lets it go', async () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    send.mockImplementation(async ({ clientId }: { clientId: string }) => {
      outboxItems = [{ clientId, status: 'waiting' }];
      return false;
    });
    const { rerender } = render(<SendMessageLauncher to={TO} onClose={vi.fn()} />);
    await userEvent.type(box(), 'Hello');
    await userEvent.click(sendBtn());
    expect(
      await screen.findByText(/We’ll send your messages when you’re back online/),
    ).toBeVisible();
    expect(screen.queryByText(/Not sent/)).not.toBeInTheDocument();
    // Back online: the outbox stores it and lets it go.
    online.mockReturnValue(true);
    outboxItems = [];
    rerender(<SendMessageLauncher to={TO} onClose={vi.fn()} />);
    expect(await screen.findByRole('dialog', { name: 'Message sent' })).toBeVisible();
    online.mockRestore();
  });

  it('queued offline, then refused because the file expired: a new file sends as a new message', async () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const old = { id: 'f-old', name: 'Old.pdf', sizeBytes: 10, contentType: 'application/pdf' };
    const fresh = { id: 'f-new', name: 'New.pdf', sizeBytes: 10, contentType: 'application/pdf' };
    upload.mockResolvedValueOnce(old).mockResolvedValueOnce(fresh);
    send.mockImplementationOnce(async ({ clientId }: { clientId: string }) => {
      outboxItems = [{ clientId, status: 'waiting', file: old }];
      return false;
    });
    const { container, rerender } = render(<SendMessageLauncher to={TO} onClose={vi.fn()} />);
    const input = () =>
      container.ownerDocument.querySelector('input[type=file]') as HTMLInputElement;
    await userEvent.upload(input(), new File(['%PDF'], 'Old.pdf', { type: 'application/pdf' }));
    await screen.findByRole('button', { name: 'View Old.pdf' });
    await userEvent.type(box(), 'My CV');
    await userEvent.click(sendBtn());
    await screen.findByText(/We’ll send your messages when you’re back online/);
    // Back online, the server refuses it: the upload was swept.
    online.mockReturnValue(true);
    const first = send.mock.calls[0]?.[0].clientId;
    outboxItems = [
      {
        clientId: first,
        status: 'failed',
        problem: 'https://edufurther.com/problems/file-unavailable',
        file: old,
      },
    ];
    rerender(<SendMessageLauncher to={TO} onClose={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your file expired. Attach it again.',
    );
    expect(screen.queryByRole('button', { name: 'View Old.pdf' })).toBeNull();
    expect(screen.queryByText(/Not sent/)).toBeNull();
    // A new file: it shows, the line goes, and Send sends it as a new message.
    await userEvent.upload(input(), new File(['%PDF'], 'New.pdf', { type: 'application/pdf' }));
    await screen.findByRole('button', { name: 'View New.pdf' });
    expect(screen.queryByText('Your file expired. Attach it again.')).toBeNull();
    send.mockResolvedValueOnce(true);
    await userEvent.click(sendBtn());
    expect(discard).toHaveBeenCalledWith(first);
    expect(send).toHaveBeenLastCalledWith(expect.objectContaining({ body: 'My CV', file: fresh }));
    expect(send.mock.calls[1]?.[0].clientId).not.toBe(first);
    expect(retry).not.toHaveBeenCalled();
    online.mockRestore();
  });

  it('a queued message the reconnect refuses: back to the form, failed, and Send again retries it', async () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    send.mockImplementation(async ({ clientId }: { clientId: string }) => {
      outboxItems = [{ clientId, status: 'waiting' }];
      return false;
    });
    retry.mockResolvedValue(true);
    const { rerender } = render(<SendMessageLauncher to={TO} onClose={vi.fn()} />);
    await userEvent.type(box(), 'Hello');
    await userEvent.click(sendBtn());
    await screen.findByText(/We’ll send your messages when you’re back online/);
    online.mockReturnValue(true);
    const id = send.mock.calls[0]?.[0].clientId;
    outboxItems = [{ clientId: id, status: 'failed' }];
    rerender(<SendMessageLauncher to={TO} onClose={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Not sent.');
    expect(sendBtn()).not.toHaveAttribute('aria-busy', 'true');
    await userEvent.click(sendBtn());
    expect(retry).toHaveBeenCalledWith(id);
    online.mockRestore();
  });

  it('refused as not connected (403): says so, not "check your connection"', async () => {
    send.mockImplementation(async ({ clientId }: { clientId: string }) => {
      outboxItems = [{ clientId, status: 'failed', problem: '/problems/not-connected' }];
      return false;
    });
    render(<SendMessageLauncher to={TO} onClose={vi.fn()} />);
    await userEvent.type(box(), 'Hello');
    await userEvent.click(sendBtn());
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Not sent. You can’t message Amara right now.',
    );
  });

  it('the "wait for your file" line goes once the upload ends', async () => {
    let done: (f: unknown) => void = () => {};
    upload.mockReturnValue(new Promise((r) => (done = r)));
    const { container } = render(<SendMessageLauncher to={TO} onClose={vi.fn()} />);
    await userEvent.upload(
      container.ownerDocument.querySelector('input[type=file]')!,
      new File(['%PDF'], 'CV.pdf', { type: 'application/pdf' }),
    );
    await userEvent.type(box(), 'Hello');
    await userEvent.click(sendBtn());
    expect(screen.getByRole('alert')).toHaveTextContent('Wait for your file');
    done({ id: 'f1', name: 'CV.pdf', sizeBytes: 1000, contentType: 'application/pdf' });
    await screen.findByRole('button', { name: 'View CV.pdf' });
    expect(screen.queryByText(/Wait for your file/)).not.toBeInTheDocument();
  });

  it('Send while the file is still uploading waits, and sends nothing', async () => {
    upload.mockReturnValue(new Promise(() => {}));
    const { container } = render(<SendMessageLauncher to={TO} onClose={vi.fn()} />);
    await userEvent.upload(
      container.ownerDocument.querySelector('input[type=file]')!,
      new File(['%PDF'], 'CV.pdf', { type: 'application/pdf' }),
    );
    await userEvent.type(box(), 'Hello');
    await userEvent.click(sendBtn());
    expect(screen.getByRole('alert')).toHaveTextContent('Wait for your file to finish uploading.');
    expect(send).not.toHaveBeenCalled();
  });

  it('a send that throws comes back to the form, failed, not stuck on Sending…', async () => {
    send.mockRejectedValue(new Error('boom'));
    render(<SendMessageLauncher to={TO} onClose={vi.fn()} />);
    await userEvent.type(box(), 'Hello');
    await userEvent.click(sendBtn());
    expect(await screen.findByRole('alert')).toHaveTextContent('Not sent.');
    expect(sendBtn()).toBeEnabled();
  });

  it('Send again after a throw sends it, never a false "Message sent"', async () => {
    send.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(true);
    render(<SendMessageLauncher to={TO} onClose={vi.fn()} />);
    await userEvent.type(box(), 'Hello');
    await userEvent.click(sendBtn());
    expect(await screen.findByRole('alert')).toHaveTextContent('Not sent.');
    await userEvent.click(sendBtn());
    expect(send).toHaveBeenCalledTimes(2);
    expect(retry).not.toHaveBeenCalled();
    expect(await screen.findByRole('dialog', { name: 'Message sent' })).toBeVisible();
  });

  it('a send that fails while the outbox re-queues it shows Sending…, not Not sent', async () => {
    send.mockImplementation(async ({ clientId }: { clientId: string }) => {
      outboxItems = [{ clientId, status: 'sending' }];
      return false;
    });
    render(<SendMessageLauncher to={TO} onClose={vi.fn()} />);
    await userEvent.type(box(), 'Hello');
    await userEvent.click(sendBtn());
    expect(await screen.findByRole('button', { name: 'Sending…' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('holds the form back while the chat status loads, then focuses the box', () => {
    status = { ...status, data: null, isLoading: true };
    const { rerender } = render(<SendMessageLauncher to={TO} onClose={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading your chat');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    status = { ...status, data: { lock: null, sessionWindow: false }, isLoading: false };
    rerender(<SendMessageLauncher to={TO} onClose={vi.fn()} />);
    expect(box()).toHaveFocus();
  });

  it('a status read of 404 ("not connected") says so up front too', () => {
    status = { ...status, data: null, error: { kind: 'notFound', message: 'x' } };
    render(<SendMessageLauncher to={TO} onClose={vi.fn()} />);
    expect(screen.getByText('You can’t message Amara right now.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('a refused status read (403) says so up front, with no form', () => {
    status = {
      ...status,
      data: null,
      error: { kind: 'forbidden', message: 'x' },
    };
    render(<SendMessageLauncher to={TO} onClose={vi.fn()} />);
    expect(screen.getByText('You can’t message Amara right now.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
