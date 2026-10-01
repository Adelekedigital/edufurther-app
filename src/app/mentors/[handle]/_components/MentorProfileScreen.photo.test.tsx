import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fullProfile } from '@/components/organisms/ProfileHeader/profile.fixture';
import { h, removePhoto, state, uploadPhoto } from './profileScreen.harness';
import { MentorProfileScreen } from './MentorProfileScreen';

// The data hooks, mocked (hoisted above the imports; state lives in the harness).
vi.mock('next/navigation', async () =>
  (await import('./profileScreen.harness')).mocks.navigation(),
);
vi.mock('@/app/_shell/useAppShell', async () =>
  (await import('./profileScreen.harness')).mocks.appShell(),
);
vi.mock('@/lib/api/data/reviews', async () =>
  (await import('./profileScreen.harness')).mocks.reviews(),
);
vi.mock('@/lib/api/data/reviewWrite', async () =>
  (await import('./profileScreen.harness')).mocks.reviewWrite(),
);
vi.mock('@/lib/api/data/similar', async () =>
  (await import('./profileScreen.harness')).mocks.similar(),
);
vi.mock('@/lib/api/data/profile', async () =>
  (await import('./profileScreen.harness')).mocks.profile(),
);
vi.mock('@/lib/api/data/cover', async () =>
  (await import('./profileScreen.harness')).mocks.cover(),
);
vi.mock('@/lib/api/data/avatar', async () =>
  (await import('./profileScreen.harness')).mocks.avatar(),
);
vi.mock('@/lib/api/data/profileEdit', async () =>
  (await import('./profileScreen.harness')).mocks.profileEdit(),
);
vi.mock('@/lib/api/data/booking', async () =>
  (await import('./profileScreen.harness')).mocks.booking(),
);

const own = { ...fullProfile, owner: { approval: 'approved' as const, listed: true } };
const png = new File(['x'], 'me.png', { type: 'image/png' });

describe('MentorProfileScreen — the owner’s photo', () => {
  it('only the owner gets the photo control; picking a file uploads it', async () => {
    h.profile = state({ data: fullProfile });
    const { unmount } = render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByLabelText(/^(Add|Change) photo$/)).toBeNull();
    unmount();
    h.profile = state({ data: own });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    const input = screen.getByLabelText(own.mentor.photoUrl ? 'Change photo' : 'Add photo');
    await user.upload(input, png);
    expect(uploadPhoto).toHaveBeenCalledWith(png);
  });

  it('without a photo it offers "Add photo"', () => {
    h.profile = state({ data: { ...own, mentor: { ...own.mentor, photoUrl: null } } });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByLabelText('Add photo')).toBeInTheDocument();
  });

  it('uploading and a failed pick show on the photo', () => {
    h.profile = state({ data: own });
    h.photoUploading = true;
    h.photoError = 'Choose an image under 5 MB.';
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText('Uploading photo…')).toBeInTheDocument();
    expect(
      screen.getByText('Choose an image under 5 MB.', { selector: 'span:not([role])' }),
    ).toBeInTheDocument();
  });

  it('"Remove photo" asks first; "Keep it" keeps it, "Remove photo" removes it (FE #98)', async () => {
    const withPhoto = { ...own, mentor: { ...own.mentor, photoUrl: 'https://cdn/me.webp' } };
    h.profile = state({ data: withPhoto });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    const badge = screen.getByRole('button', { name: 'Photo options' });
    await user.click(badge);
    await user.click(screen.getByRole('menuitem', { name: /Remove photo/ }));
    let dialog = screen.getByRole('dialog', { name: 'Remove your photo?' });
    expect(dialog).toHaveTextContent('Your initials show instead until you add a new one.');
    await user.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(removePhoto).not.toHaveBeenCalled();
    await user.click(badge);
    await user.click(screen.getByRole('menuitem', { name: /Remove photo/ }));
    dialog = screen.getByRole('dialog', { name: 'Remove your photo?' });
    await user.click(screen.getByRole('button', { name: 'Remove photo' }));
    expect(removePhoto).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('not in "View as mentee": no photo control at all', async () => {
    const withPhoto = { ...own, mentor: { ...own.mentor, photoUrl: 'https://cdn/me.webp' } };
    h.profile = state({ data: withPhoto });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('button', { name: 'Photo options' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'View as mentee' }));
    expect(screen.queryByRole('button', { name: 'Photo options' })).toBeNull();
  });

  it('removed: "Photo removed." is said and focus lands on "Add photo" (review of PR 125)', async () => {
    const withPhoto = { ...own, mentor: { ...own.mentor, photoUrl: 'https://cdn/me.webp' } };
    h.profile = state({ data: withPhoto });
    const { rerender } = render(<MentorProfileScreen handle="gbenga" />);
    // The removal lands: no photo, and the hook's stamp moves.
    h.profile = state({ data: { ...withPhoto, mentor: { ...withPhoto.mentor, photoUrl: null } } });
    h.photoRemovedStamp = 1;
    rerender(<MentorProfileScreen handle="gbenga" />);
    await new Promise((r) => requestAnimationFrame(r));
    // The badge (first), not the note's own "Add photo".
    expect(document.getElementById('profile-photo-input')).toHaveFocus();
    expect(screen.getAllByText('Photo removed.').length).toBeGreaterThan(0);
    expect(screen.getByText(/Your initials show until you add a new one/)).toBeInTheDocument();
  });

  it('while it goes, and if it fails, focus stays on the badge (review of PR 125)', async () => {
    const withPhoto = { ...own, mentor: { ...own.mentor, photoUrl: 'https://cdn/me.webp' } };
    h.profile = state({ data: withPhoto });
    const user = userEvent.setup();
    const { rerender } = render(<MentorProfileScreen handle="gbenga" />);
    const badge = screen.getByRole('button', { name: 'Photo options' });
    await user.click(badge);
    await user.click(screen.getByRole('menuitem', { name: /Remove photo/ }));
    await user.click(screen.getByRole('button', { name: 'Remove photo' }));
    // Removing: the same badge, inert.
    h.photoRemoving = true;
    rerender(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('button', { name: 'Photo options' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Photo options' })).toHaveFocus();
    // It failed: still there, still focused, and it says why.
    h.photoRemoving = false;
    h.photoError = 'Your photo wasn’t removed. Try again.';
    rerender(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('button', { name: 'Photo options' })).toHaveFocus();
    expect(screen.getAllByText('Your photo wasn’t removed. Try again.').length).toBeGreaterThan(0);
  });
});
