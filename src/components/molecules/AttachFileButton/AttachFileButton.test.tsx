import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AttachFileButton } from './AttachFileButton';

const hint = 'PDF or Word (.docx) · max 5 MB';

describe('AttachFileButton', () => {
  it('is a named button that says what it takes', () => {
    render(<AttachFileButton label="Attach a file" hint={hint} onFile={vi.fn()} />);
    const b = screen.getByRole('button', { name: 'Attach a file' });
    expect(b).toHaveAttribute('title', hint);
  });

  it('hands over the picked file, and takes PDF or .docx only', async () => {
    const onFile = vi.fn();
    const { container } = render(
      <AttachFileButton label="Attach a file" hint={hint} onFile={onFile} />,
    );
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    expect(input).toHaveAttribute('accept', '.pdf,.docx');
    const f = new File(['%PDF'], 'a.pdf', { type: 'application/pdf' });
    await userEvent.upload(input, f);
    expect(onFile).toHaveBeenCalledWith(f);
  });

  it('off once a file is attached', () => {
    render(<AttachFileButton label="Attach a file" hint={hint} onFile={vi.fn()} disabled />);
    expect(screen.getByRole('button', { name: 'Attach a file' })).toBeDisabled();
  });
});
