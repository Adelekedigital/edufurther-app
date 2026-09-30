import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fullProfile } from '@/components/organisms/ProfileHeader/profile.fixture';
import { h, state, uploadPhoto } from './profileScreen.harness';
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
});
