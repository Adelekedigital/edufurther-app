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

  it('while uploading: a spinner is announced and the picker is off', () => {
    render(<PhotoPicker {...base} uploading />);
    expect(screen.getByRole('status')).toHaveTextContent('Uploading photo…');
    expect(screen.getByLabelText('Change photo')).toBeDisabled();
  });

  it('a failed pick says why, and can be dismissed', async () => {
    const user = userEvent.setup();
    const onDismissError = vi.fn();
    render(
      <PhotoPicker {...base} error="Choose an image under 5 MB." onDismissError={onDismissError} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Choose an image under 5 MB.');
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismissError).toHaveBeenCalled();
  });
});
