import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AppError } from '@/types/mentor';
import { FileViewer, type FileViewerProps } from './FileViewer';

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const view = (over: Partial<FileViewerProps> = {}) => {
  const props: FileViewerProps = {
    name: 'Amara_Okafor_SOP_draft.pdf',
    contentType: 'application/pdf',
    size: 240 * 1024,
    url: 'blob:mock/1',
    isLoading: false,
    error: null,
    onRetry: vi.fn(),
    onClose: vi.fn(),
    ...over,
  };
  return { props, ...render(<FileViewer {...props} />) };
};

const failure = (kind: AppError['kind']): AppError => ({ kind, message: 'x' });

describe('FileViewer: the header says what the file is and who shared it', () => {
  it('titles the dialog with the file name; the subtitle reads type, size, sharer', () => {
    view({ sharedBy: { mine: false, firstName: 'Amara' } });
    const dialog = screen.getByRole('dialog', { name: 'Amara_Okafor_SOP_draft.pdf' });
    expect(dialog).toHaveAccessibleDescription('PDF · 240 KB · Shared by Amara');
  });

  it('a Word file is a Word document, and your own file is shared by you', () => {
    view({ name: 'CV.docx', contentType: DOCX, sharedBy: { mine: true } });
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription(
      'Word document · 240 KB · Shared by you',
    );
  });

  it('a type it doesn’t know is a file, never mislabelled as Word', () => {
    view({ name: 'notes.txt', contentType: 'text/plain' });
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription('File · 240 KB');
  });

  it('with no sharer the subtitle is type and size only', () => {
    view();
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription('PDF · 240 KB');
  });
});

describe('FileViewer: every state', () => {
  it('a PDF renders in the browser’s own viewer, labelled with its name', () => {
    view();
    const obj = document.querySelector('object')!;
    expect(obj.getAttribute('data')).toBe('blob:mock/1');
    expect(obj.getAttribute('type')).toBe('application/pdf');
    expect(obj.getAttribute('aria-label')).toBe('Amara_Okafor_SOP_draft.pdf');
  });

  it('Download saves the original name from the same blob', () => {
    view();
    const link = screen.getByRole('link', { name: 'Download' });
    expect(link).toHaveAttribute('href', 'blob:mock/1');
    expect(link).toHaveAttribute('download', 'Amara_Okafor_SOP_draft.pdf');
  });

  it('Word shows no preview, and still offers Download', () => {
    view({ name: 'CV.docx', contentType: DOCX });
    expect(screen.getByRole('heading', { name: 'No preview for this file' })).toBeVisible();
    expect(screen.getByText('Download it to open it on your device.')).toBeVisible();
    expect(document.querySelector('object')).toBeNull();
    expect(screen.getByRole('link', { name: 'Download' })).toBeVisible();
  });

  it('loading says it is opening the file, through the always-present status', () => {
    view({ url: null, isLoading: true });
    expect(screen.getByRole('status')).toHaveTextContent('Opening file…');
    expect(document.querySelector('object')).toBeNull();
  });

  it('an error says so, with Try again', async () => {
    const { props } = view({ url: null, error: failure('server') });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('We couldn’t open this file');
    expect(alert).toHaveTextContent('Check your connection and try again, or download it instead.');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(props.onRetry).toHaveBeenCalled();
  });

  it('Download after a failure tries again, then saves once the bytes arrive', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { props, rerender } = view({ url: null, error: failure('offline') });
    await userEvent.click(screen.getByRole('button', { name: 'Download' }));
    expect(props.onRetry).toHaveBeenCalled();
    rerender(<FileViewer {...props} error={null} url="blob:mock/2" />);
    expect(click).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute('href', 'blob:mock/2');
    click.mockRestore();
  });

  it('Download pressed while loading keeps focus in the dialog when the link replaces it', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { props, rerender } = view({ url: null, isLoading: true });
    await userEvent.click(screen.getByRole('button', { name: 'Download' }));
    await userEvent.click(screen.getByRole('button', { name: 'Download' }));
    rerender(<FileViewer {...props} isLoading={false} url="blob:mock/2" />);
    const link = screen.getByRole('link', { name: 'Download' });
    expect(link).toHaveFocus();
    // Two presses before the bytes came are one save.
    expect(click).toHaveBeenCalledTimes(1);
    click.mockRestore();
  });

  it('Try again keeps focus in the dialog, and alone never downloads', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    // Download pressed while loading, then the fetch failed.
    const { props, rerender } = view({ url: null, isLoading: true });
    await userEvent.click(screen.getByRole('button', { name: 'Download' }));
    rerender(<FileViewer {...props} isLoading={false} error={failure('server')} />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    rerender(<FileViewer {...props} isLoading />);
    expect(screen.getByRole('button', { name: 'Download' })).toHaveFocus();
    rerender(<FileViewer {...props} isLoading={false} url="blob:mock/3" />);
    expect(click).not.toHaveBeenCalled();
    click.mockRestore();
  });

  it('a missing file (404) says so, with no retry and no Download', () => {
    view({ url: null, error: failure('notFound') });
    expect(screen.getByText('This file isn’t there anymore.')).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('This file isn’t there anymore.');
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download' })).not.toBeInTheDocument();
  });

  it('an unavailable file shows the caller’s line instead of the file', () => {
    view({ url: null, isLoading: true, unavailable: 'This file is no longer available.' });
    expect(screen.getByText('This file is no longer available.')).toBeVisible();
    expect(screen.queryByText('Opening file…')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Download' })).not.toBeInTheDocument();
  });

  it('Escape closes it', async () => {
    const { props } = view();
    await userEvent.keyboard('{Escape}');
    expect(props.onClose).toHaveBeenCalled();
  });
});
