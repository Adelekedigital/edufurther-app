import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfilePhoto } from './ProfilePhoto';

const upload = () => ({
  accept: 'image/jpeg,image/png,image/webp',
  upload: vi.fn(),
  uploading: false,
  error: null as string | null,
  errorFrom: null as 'upload' | 'remove' | null,
  dismissError: vi.fn(),
  remove: vi.fn(),
  removing: false,
  removedStamp: 0,
});
const person = { initials: 'EG', cover: 'sky' as const, src: null, name: 'Elufisan' };
const png = new File(['x'], 'me.png', { type: 'image/png' });

describe('ProfilePhoto', () => {
  it('without a photo: the initials on the cover, and "Add photo" picks a file', async () => {
    const user = userEvent.setup();
    const u = upload();
    render(<ProfilePhoto size={88} person={person} upload={u} />);
    const face = screen.getByRole('img', { name: 'Elufisan' });
    expect(face).toHaveTextContent('EG');
    expect(face.parentElement!.style.getPropertyValue('--avatar-bg')).toBe('var(--cover-sky-ink)');
    await user.upload(screen.getByLabelText('Add photo'), png);
    expect(u.upload).toHaveBeenCalledWith(png);
  });

  it('with a photo and onRemove: the badge is a menu, and Remove asks the page', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(
      <ProfilePhoto
        size={112}
        person={{ ...person, src: '/me.webp', focus: { x: 0.4, y: 0.2 } }}
        upload={upload()}
        onRemove={onRemove}
      />,
    );
    const img = screen.getByRole('img', { name: 'Elufisan' });
    expect(img.parentElement!.style.getPropertyValue('--avatar-y')).toBe('20.0%');
    await user.click(screen.getByRole('button', { name: 'Photo options' }));
    await user.click(screen.getByRole('menuitem', { name: 'Remove photo' }));
    expect(onRemove).toHaveBeenCalled();
  });

  it('compact under 96px, not at 112', () => {
    const { container, rerender } = render(
      <ProfilePhoto size={72} person={person} upload={upload()} />,
    );
    expect(container.querySelector('label')!.className).toMatch(/compactBadge/);
    rerender(<ProfilePhoto size={88} person={person} upload={upload()} />);
    expect(container.querySelector('label')!.className).toMatch(/compactBadge/);
    rerender(<ProfilePhoto size={112} person={person} upload={upload()} />);
    expect(container.querySelector('label')!.className).not.toMatch(/compactBadge/);
  });

  it('uploading: announced, the badge stays and is marked off', () => {
    render(<ProfilePhoto size={72} person={person} upload={{ ...upload(), uploading: true }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Uploading photo…');
    expect(screen.getByLabelText('Add photo')).toHaveAttribute('aria-disabled', 'true');
  });

  it('removing: announced', () => {
    render(
      <ProfilePhoto
        size={72}
        person={{ ...person, src: '/me.webp' }}
        upload={{ ...upload(), removing: true }}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Removing photo…');
  });

  it('a failed removal offers Try again, which removes; Dismiss clears it', async () => {
    const user = userEvent.setup();
    const u = {
      ...upload(),
      error: 'Your photo wasn’t removed. Try again.',
      errorFrom: 'remove' as const,
    };
    render(
      <ProfilePhoto
        size={72}
        person={{ ...person, src: '/me.webp' }}
        upload={u}
        onRemove={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(u.remove).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(u.dismissError).toHaveBeenCalled();
  });

  it('the file input takes the id the page opens it by', () => {
    render(<ProfilePhoto size={88} person={person} upload={upload()} inputId="mo-photo" />);
    expect(screen.getByLabelText('Add photo')).toHaveAttribute('id', 'mo-photo');
  });
});
