import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { MENTOR_SHARE_COPY } from '@/lib/copy/mentorShare';
import { SHARE_NOTE } from '@/lib/copy/profile';
import { ShareProfileModal } from './ShareProfileModal';

vi.mock('@/lib/analytics/track', async (orig) => ({
  ...(await orig<typeof import('@/lib/analytics/track')>()),
  track: vi.fn(),
}));

const URL = 'https://app.test/mentors/gbenga';

function renderModal(over: Partial<ComponentProps<typeof ShareProfileModal>> = {}) {
  const props = { url: URL, name: 'Gbenga Elufisan', onShared: vi.fn(), onClose: vi.fn(), ...over };
  render(<ShareProfileModal {...props} />);
  return props;
}

describe('ShareProfileModal', () => {
  it('someone else’s profile: named for the mentor, with a reason to send it', () => {
    renderModal();
    expect(
      screen.getByRole('dialog', { name: 'Share Gbenga Elufisan’s profile' }),
    ).toHaveAccessibleDescription('Send it to someone it could help.');
  });

  it('their own profile: says what mentees can do with the link', () => {
    renderModal({ own: true });
    expect(screen.getByRole('dialog', { name: 'Share your profile' })).toHaveAccessibleDescription(
      'Mentees who open the link can see your profile and book a session.',
    );
  });

  it('a note (the profile isn’t public yet) replaces the subtitle', () => {
    renderModal({ own: true, note: SHARE_NOTE.pending });
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription(SHARE_NOTE.pending);
  });

  it('shows the link, and Copy puts the message then the link on the clipboard', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const p = renderModal({ own: true });
    expect(screen.getByText('app.test/mentors/gbenga')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(writeText).toHaveBeenCalledWith(
      `${MENTOR_SHARE_COPY.message(true, 'Gbenga Elufisan')}\n${URL}`,
    );
    expect(p.onShared).toHaveBeenCalledTimes(1);
  });

  it('Share sends the share sheet a title, the message and the link', async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    renderModal();
    await user.click(screen.getByRole('button', { name: 'Share' }));
    expect(share).toHaveBeenCalledWith({
      title: 'Gbenga Elufisan on EduFurther',
      text: MENTOR_SHARE_COPY.message(false, 'Gbenga Elufisan'),
      url: URL,
    });
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });

  it('closes from its close button', async () => {
    const user = userEvent.setup();
    const p = renderModal();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(p.onClose).toHaveBeenCalled();
  });
});
