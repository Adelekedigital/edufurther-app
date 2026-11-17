import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyLinkButton } from './CopyLinkButton';

const clip = (writeText: () => Promise<void>) =>
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

describe('CopyLinkButton', () => {
  it('copies the link and says so, politely, then settles back', async () => {
    const user = userEvent.setup();
    const write = vi.fn().mockResolvedValue(undefined);
    clip(write);
    render(<CopyLinkButton label="Copy share link for SOP" url="https://x.test/m?book=a" />);
    await user.click(screen.getByRole('button', { name: 'Copy share link for SOP' }));
    expect(write).toHaveBeenCalledWith('https://x.test/m?book=a');
    expect(await screen.findByRole('status')).toHaveTextContent('Link copied');
    await act(() => new Promise((r) => setTimeout(r, 1900)));
    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it('a refused clipboard says it couldn’t copy (never "copied")', async () => {
    const user = userEvent.setup();
    clip(() => Promise.reject(new Error('denied')));
    const onCopied = vi.fn();
    render(<CopyLinkButton label="Copy share link for SOP" url="u" onCopied={onCopied} />);
    await user.click(screen.getByRole('button', { name: 'Copy share link for SOP' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Couldn’t copy. Try again.');
    expect(onCopied).not.toHaveBeenCalled();
  });

  it('tells the page once the link is on the clipboard', async () => {
    const user = userEvent.setup();
    clip(vi.fn().mockResolvedValue(undefined));
    const onCopied = vi.fn();
    render(<CopyLinkButton label="Copy share link for SOP" url="u" onCopied={onCopied} />);
    await user.click(screen.getByRole('button', { name: 'Copy share link for SOP' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Link copied');
    expect(onCopied).toHaveBeenCalledOnce();
  });
});
