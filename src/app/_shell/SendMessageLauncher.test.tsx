import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MessageRecipient, Thread } from '@/types/messages';
import { SendMessageLauncher } from './SendMessageLauncher';

const send = vi.fn();
const retry = vi.fn();
const upload = vi.fn();
let status: { data: Partial<Thread> | null; isLoading: boolean; error: null; retry: () => void };

vi.mock('@/lib/api/data/messageSend', () => ({
  useSendMessage: () => ({
    send: (...a: unknown[]) => send(...a),
    retry: (...a: unknown[]) => retry(...a),
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
  send.mockReset();
  retry.mockReset();
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
    send.mockResolvedValue(false);
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
    send.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
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

  it('a refused upload says why, and nothing is attached', async () => {
    upload.mockRejectedValue({ message: 'Use a PDF or Word (.docx) file.' });
    const { container } = render(<SendMessageLauncher to={TO} onClose={vi.fn()} />);
    await userEvent.upload(
      container.ownerDocument.querySelector('input[type=file]')!,
      new File(['x'], 'a.pdf', { type: 'application/pdf' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Use a PDF or Word (.docx) file.');
    expect(screen.getByRole('button', { name: 'Attach a file' })).toBeEnabled();
  });
});
