import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PickedFileChip } from './PickedFileChip';

const FILE = { id: 'f1', name: 'CV.pdf', sizeBytes: 240 * 1024, contentType: 'application/pdf' };

describe('PickedFileChip', () => {
  it('renders nothing with no file', () => {
    const { container } = render(
      <PickedFileChip
        file={null}
        uploading={null}
        onView={() => {}}
        onRemove={() => {}}
        look="outlined"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('while uploading: the name and "Uploading…", busy, no actions', () => {
    render(
      <PickedFileChip
        file={null}
        uploading="CV.pdf"
        onView={() => {}}
        onRemove={() => {}}
        look="filled"
      />,
    );
    expect(screen.getByText('CV.pdf').closest('[aria-busy]')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Uploading…')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('once uploaded: view and remove', async () => {
    const onView = vi.fn();
    const onRemove = vi.fn();
    render(
      <PickedFileChip
        file={FILE}
        uploading={null}
        onView={onView}
        onRemove={onRemove}
        look="outlined"
      />,
    );
    expect(screen.getByText('240 KB')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'View CV.pdf' }));
    expect(onView).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Remove file' }));
    expect(onRemove).toHaveBeenCalledOnce();
  });
});
