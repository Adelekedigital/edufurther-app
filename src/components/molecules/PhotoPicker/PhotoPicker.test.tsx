import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoPicker } from './PhotoPicker';

const base = {
  hasPhoto: true,
  accept: 'image/jpeg,image/png,image/webp',
  uploading: false,
  onFile: vi.fn(),
  error: null,
  onDismissError: vi.fn(),
};
const png = new File(['x'], 'me.png', { type: 'image/png' });

describe('PhotoPicker', () => {
  it('is a labelled file input: "Change photo" with a photo, "Add photo" without', () => {
    const { rerender } = render(<PhotoPicker {...base} />);
    expect(screen.getByLabelText('Change photo')).toHaveAttribute('type', 'file');
    expect(screen.getByLabelText('Change photo')).toHaveAttribute('accept', base.accept);
    rerender(<PhotoPicker {...base} hasPhoto={false} />);
    expect(screen.getByLabelText('Add photo')).toBeInTheDocument();
  });

  it('hands over the picked file, and the same file can be picked again', async () => {
    const user = userEvent.setup();
    const onFile = vi.fn();
    render(<PhotoPicker {...base} onFile={onFile} />);
    const input = screen.getByLabelText('Change photo') as HTMLInputElement;
    await user.upload(input, png);
    expect(onFile).toHaveBeenCalledWith(png);
    expect(input.value).toBe('');
  });

  it('while uploading: a spinner is announced and the picker is marked off', () => {
    render(<PhotoPicker {...base} uploading />);
    expect(screen.getByRole('status')).toHaveTextContent('Uploading photo…');
    expect(screen.getByLabelText('Change photo')).toHaveAttribute('aria-disabled', 'true');
  });

  it('a failed pick says why, and can be dismissed', async () => {
    const user = userEvent.setup();
    const onDismissError = vi.fn();
    render(
      <PhotoPicker {...base} error="Choose an image under 5 MB." onDismissError={onDismissError} />,
    );
    expect(
      screen.getByText('Choose an image under 5 MB.', { selector: 'span:not([role])' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismissError).toHaveBeenCalled();
  });

  it('stays focusable while uploading, and ignores a second pick (review of #99)', async () => {
    const user = userEvent.setup();
    const onFile = vi.fn();
    render(<PhotoPicker {...base} uploading onFile={onFile} />);
    const input = screen.getByLabelText('Change photo');
    expect(input).not.toBeDisabled();
    expect(input).toHaveAttribute('aria-disabled', 'true');
    input.focus();
    expect(input).toHaveFocus();
    await user.upload(input, png);
    expect(onFile).not.toHaveBeenCalled();
  });

  it('its status is always there, so "Uploading photo…" is heard (review of #99)', () => {
    const { rerender } = render(<PhotoPicker {...base} />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('');
    rerender(<PhotoPicker {...base} uploading />);
    expect(screen.getByRole('status')).toBe(status);
    expect(status).toHaveTextContent('Uploading photo…');
  });

  it('a failed pick is heard through the same always-present status (Codex on #99)', () => {
    const { rerender } = render(<PhotoPicker {...base} />);
    const status = screen.getByRole('status');
    rerender(<PhotoPicker {...base} error="Choose an image under 5 MB." />);
    expect(screen.getByRole('status')).toBe(status);
    expect(status).toHaveTextContent('Choose an image under 5 MB.');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('Dismiss puts focus back on the photo control (Codex on #99)', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <PhotoPicker {...base} error="Choose an image under 5 MB." onDismissError={vi.fn()} />,
    );
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    rerender(<PhotoPicker {...base} error={null} />);
    expect(screen.getByLabelText('Change photo')).toHaveFocus();
  });

  describe('with a photo and Remove (FE #98)', () => {
    it('the badge is a menu: "Change photo" opens the picker, "Remove photo" asks the page', async () => {
      const onRemove = vi.fn();
      const click = vi.spyOn(HTMLInputElement.prototype, 'click');
      const user = userEvent.setup();
      render(<PhotoPicker {...base} onRemove={onRemove} inputId="pic" />);
      const badge = screen.getByRole('button', { name: 'Photo options' });
      await user.click(badge);
      await user.click(screen.getByRole('menuitem', { name: /Upload a new photo/ }));
      expect(click.mock.contexts.some((el) => (el as HTMLInputElement).id === 'pic')).toBe(true);
      click.mockRestore();
      await user.click(badge);
      await user.click(screen.getByRole('menuitem', { name: /Remove photo/ }));
      expect(onRemove).toHaveBeenCalled();
    });

    it('while busy: the same badge, inert (it keeps focus), and it says so (review of PR 125)', async () => {
      const user = userEvent.setup();
      render(<PhotoPicker {...base} onRemove={vi.fn()} removing />);
      const badge = screen.getByRole('button', { name: 'Photo options' });
      expect(badge).toHaveAttribute('aria-disabled', 'true');
      await user.click(badge);
      expect(screen.queryByRole('menu')).toBeNull();
      expect(screen.getByRole('status')).toHaveTextContent('Removing photo…');
    });

    it('Dismiss returns focus to the menu button (review of PR 125)', async () => {
      const user = userEvent.setup();
      render(
        <PhotoPicker {...base} onRemove={vi.fn()} error="Your photo wasn’t removed. Try again." />,
      );
      await user.click(screen.getByRole('button', { name: 'Dismiss' }));
      expect(screen.getByRole('button', { name: 'Photo options' })).toHaveFocus();
    });

    it('without a photo, no menu: "Add photo" picks straight away', () => {
      render(<PhotoPicker {...base} hasPhoto={false} onRemove={vi.fn()} />);
      expect(screen.queryByRole('button', { name: 'Photo options' })).toBeNull();
      expect(screen.getByLabelText('Add photo')).toHaveAttribute('type', 'file');
    });
  });

  describe('the notes under the photo (ProfilePhoto.dc.html)', () => {
    const removed = { ...base, hasPhoto: false, onRemove: vi.fn() };

    it('a removal shows "Photo removed." with Add photo and Dismiss; Dismiss returns to the badge', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<PhotoPicker {...removed} removedStamp={0} />);
      expect(screen.queryByText(/Your initials show until/)).toBeNull();
      rerender(<PhotoPicker {...removed} removedStamp={1} />);
      expect(screen.getByText('Photo removed.')).toBeInTheDocument();
      expect(screen.getByText(/Your initials show until you add a new one/)).toBeInTheDocument();
      expect(screen.getAllByLabelText('Add photo')).toHaveLength(2);
      await user.click(screen.getByRole('button', { name: 'Dismiss' }));
      expect(screen.queryByText('Photo removed.')).toBeNull();
      expect(screen.getByLabelText('Add photo')).toHaveFocus();
    });

    it('it goes after 6s, but waits while pointed at', () => {
      vi.useFakeTimers();
      try {
        const { rerender } = render(<PhotoPicker {...removed} removedStamp={0} />);
        rerender(<PhotoPicker {...removed} removedStamp={1} />);
        const note = screen.getByText('Photo removed.').closest('div')!;
        fireEvent.mouseEnter(note);
        act(() => vi.advanceTimersByTime(7000));
        expect(screen.getByText('Photo removed.')).toBeInTheDocument();
        fireEvent.mouseLeave(note);
        act(() => vi.advanceTimersByTime(6000));
        expect(screen.queryByText('Photo removed.')).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it('a pick from the note hands over the file and closes it', async () => {
      const user = userEvent.setup();
      const onFile = vi.fn();
      const { rerender } = render(<PhotoPicker {...removed} onFile={onFile} removedStamp={0} />);
      rerender(<PhotoPicker {...removed} onFile={onFile} removedStamp={1} />);
      await user.upload(
        within(screen.getByText('Photo removed.').closest('div')!).getByLabelText(
          'Add photo',
        ) as HTMLInputElement,
        png,
      );
      expect(onFile).toHaveBeenCalledWith(png);
      expect(screen.queryByText('Photo removed.')).toBeNull();
    });

    it('a failed removal offers "Try again", which removes again from the badge', async () => {
      const user = userEvent.setup();
      const retry = vi.fn();
      render(
        <PhotoPicker
          {...base}
          onRemove={vi.fn()}
          onRetryRemove={retry}
          error="Your photo wasn’t removed. Try again."
          errorFrom="remove"
        />,
      );
      await user.click(screen.getByRole('button', { name: 'Try again' }));
      expect(retry).toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Photo options' })).toHaveFocus();
    });

    it('a failed upload offers Dismiss only', () => {
      render(
        <PhotoPicker
          {...base}
          onRemove={vi.fn()}
          onRetryRemove={vi.fn()}
          error="The photo didn’t upload. Try again."
          errorFrom="upload"
        />,
      );
      expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
    });
  });
});
