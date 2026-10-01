import { render, screen } from '@testing-library/react';
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
      const badge = screen.getByRole('button', { name: 'Change or remove photo' });
      await user.click(badge);
      await user.click(screen.getByRole('menuitem', { name: /Change photo/ }));
      expect(click.mock.contexts.some((el) => (el as HTMLInputElement).id === 'pic')).toBe(true);
      click.mockRestore();
      await user.click(badge);
      await user.click(screen.getByRole('menuitem', { name: /Remove photo/ }));
      expect(onRemove).toHaveBeenCalled();
    });

    it('while removing: the photo dims, the badge is the plain one, disabled, and it says so', () => {
      render(<PhotoPicker {...base} onRemove={vi.fn()} removing />);
      expect(screen.queryByRole('button', { name: 'Change or remove photo' })).toBeNull();
      expect(screen.getByLabelText('Change photo')).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByRole('status')).toHaveTextContent('Removing photo…');
    });

    it('without a photo, no menu: "Add photo" picks straight away', () => {
      render(<PhotoPicker {...base} hasPhoto={false} onRemove={vi.fn()} />);
      expect(screen.queryByRole('button', { name: 'Change or remove photo' })).toBeNull();
      expect(screen.getByLabelText('Add photo')).toHaveAttribute('type', 'file');
    });
  });
});
