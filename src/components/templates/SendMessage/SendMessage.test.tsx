import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SendMessage, type SendMessageProps } from './SendMessage';

let narrow = false;
vi.mock('@/lib/utils/useMediaQuery', () => ({ useMediaQuery: () => narrow }));

const TO: SendMessageProps['to'] = {
  id: 'u-amara',
  name: 'Amara Okafor',
  firstName: 'Amara',
  initials: 'AO',
  avatarUrl: null,
  avatarFocus: null,
  cover: 'rose',
  role: 'mentee',
  institution: 'University of Lagos',
};

const view = (over: Partial<SendMessageProps> = {}) => {
  const props: SendMessageProps = {
    to: TO,
    sessionWindow: false,
    lock: null,
    phase: 'compose',
    failed: false,
    onSend: vi.fn(),
    file: null,
    uploading: null,
    fileError: null,
    onPickFile: vi.fn(),
    onRemoveFile: vi.fn(),
    onViewFile: vi.fn(),
    chatHref: '/messages?with=u-amara',
    onClose: vi.fn(),
    ...over,
  };
  return { props, ...render(<SendMessage {...props} />) };
};

const box = () => screen.getByRole('textbox', { name: 'Write to Amara' });

beforeEach(() => {
  narrow = false;
});

describe('SendMessage: compose', () => {
  it('is titled for the person, shows who it goes to, and focuses the box', async () => {
    view();
    expect(screen.getByRole('dialog', { name: 'Message Amara' })).toBeVisible();
    expect(screen.getByText('Amara Okafor')).toBeVisible();
    expect(screen.getByText('Mentee · University of Lagos')).toBeVisible();
    await vi.waitFor(() => expect(box()).toHaveFocus());
    expect(box()).toHaveAttribute('maxLength', '2000');
  });

  it('sends what was written', async () => {
    const { props } = view();
    await userEvent.type(box(), 'Hi Amara');
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(props.onSend).toHaveBeenCalledWith('Hi Amara');
  });

  it('with nothing written, Send says so and marks the box, sending nothing', async () => {
    const { props } = view();
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Write a message to Amara first.');
    expect(box()).toHaveAttribute('aria-invalid', 'true');
    expect(box()).toHaveFocus();
    expect(props.onSend).not.toHaveBeenCalled();
  });

  it('a file alone is enough to send', async () => {
    const { props } = view({
      file: { id: 'f1', name: 'CV.pdf', sizeBytes: 240 * 1024, contentType: 'application/pdf' },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(props.onSend).toHaveBeenCalledWith('');
  });

  it('sending: the button says so and is busy', () => {
    view({ phase: 'sending' });
    expect(screen.getByRole('button', { name: 'Sending…' })).toHaveAttribute('aria-busy', 'true');
  });

  it('a failure says so', () => {
    view({ failed: true });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Not sent. Check your connection and try again.',
    );
  });

  it('counts down past 1,800 characters', async () => {
    view();
    await userEvent.click(box());
    await userEvent.paste('a'.repeat(1801));
    expect(screen.getByText('199 left')).toBeVisible();
  });

  it('contact details bring the notice, which never blocks sending', async () => {
    const { props } = view();
    await userEvent.type(box(), 'email me at amara@example.com');
    expect(screen.getByText(/Sharing contact details\?/)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(props.onSend).toHaveBeenCalled();
  });

  it('says where it goes, and that it is emailed in the session window', () => {
    const { unmount } = view();
    expect(screen.getByText('This goes to your chat with Amara in Messages.')).toBeVisible();
    unmount();
    view({ sessionWindow: true });
    expect(
      screen.getByText('Your session starts soon, so we’ll also email this to Amara right away.'),
    ).toBeVisible();
  });
});

describe('SendMessage: one file', () => {
  const FILE = { id: 'f1', name: 'CV.pdf', sizeBytes: 240 * 1024, contentType: 'application/pdf' };

  it('the hint says what it takes, shorter on phones', () => {
    const { unmount } = view();
    expect(screen.getByText('PDF or Word (.docx) · max 5 MB')).toBeVisible();
    unmount();
    narrow = true;
    view();
    expect(screen.getByText('PDF or Word · 5 MB')).toBeVisible();
  });

  it('attached: name opens it, size, Remove file, and Attach is off', async () => {
    const { props } = view({ file: FILE });
    expect(screen.getByText('1 file attached')).toBeVisible();
    expect(screen.getByText('240 KB')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Attach a file' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'View CV.pdf' }));
    expect(props.onViewFile).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Remove file' }));
    expect(props.onRemoveFile).toHaveBeenCalled();
  });

  it('a refused file says why', () => {
    view({ fileError: 'That file is over 5 MB. Choose a smaller one.' });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'That file is over 5 MB. Choose a smaller one.',
    );
  });

  it('picking hands the file over', async () => {
    const { props, container } = view();
    const f = new File(['%PDF'], 'a.pdf', { type: 'application/pdf' });
    await userEvent.upload(container.ownerDocument.querySelector('input[type=file]')!, f);
    expect(props.onPickFile).toHaveBeenCalledWith(f);
  });
});

describe('SendMessage: read only and sent', () => {
  it('a paused mentor: the line instead of the form', () => {
    view({ lock: 'paused', to: { ...TO, role: 'mentor' } });
    expect(screen.getByRole('status')).toHaveTextContent('Amara isn’t taking messages right now.');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send message' })).not.toBeInTheDocument();
  });

  it('sent: says where it is, with Open chat and Done', async () => {
    const { props } = view({ phase: 'sent' });
    const dialog = screen.getByRole('dialog', { name: 'Message sent' });
    expect(dialog).toHaveAccessibleDescription('It’s in your chat with Amara in Messages.');
    expect(screen.getByRole('link', { name: 'Open chat' })).toHaveAttribute(
      'href',
      '/messages?with=u-amara',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(props.onClose).toHaveBeenCalled();
  });

  it('sent in the session window: says it was emailed too', () => {
    view({ phase: 'sent', sessionWindow: true });
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription(
      'It’s in your chat with Amara, and we emailed it to them because your session starts soon.',
    );
  });
});
