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
  const props = {
    url: URL,
    name: 'Gbenga Elufisan',
    count: vi.fn(),
    onShared: vi.fn(),
    onClose: vi.fn(),
    ...over,
  };
  render(<ShareProfileModal {...props} />);
  return props;
}

afterEach(() => {
  Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
});

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
    // Shown bare; the copied link carries its channel.
    expect(writeText).toHaveBeenCalledWith(
      `${MENTOR_SHARE_COPY.message(true, 'Gbenga Elufisan')}\n${URL}?via=copy`,
    );
    expect(p.count).toHaveBeenCalledExactlyOnceWith('copy');
    expect(p.onShared).toHaveBeenCalledExactlyOnceWith('copy');
  });

  it('Share sends the share sheet a title, the message and the link', async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    const p = renderModal();
    await user.click(screen.getByRole('button', { name: 'Share' }));
    expect(share).toHaveBeenCalledWith({
      title: 'Gbenga Elufisan on EduFurther',
      text: MENTOR_SHARE_COPY.message(false, 'Gbenga Elufisan'),
      url: `${URL}?via=share`,
    });
    expect(p.count).toHaveBeenCalledExactlyOnceWith('native');
    expect(p.onShared).toHaveBeenCalledExactlyOnceWith('native');
  });

  it('a dismissed share sheet is no share', async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' }));
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    const p = renderModal();
    await user.click(screen.getByRole('button', { name: 'Share' }));
    expect(share).toHaveBeenCalled();
    expect(p.count).not.toHaveBeenCalled();
    expect(p.onShared).not.toHaveBeenCalled();
  });

  it('a payload the browser can’t share is copied instead, without the sheet', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: () => false, configurable: true });
    renderModal();
    await user.click(screen.getByRole('button', { name: 'Share' }));
    expect(share).not.toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith(
      `${MENTOR_SHARE_COPY.message(false, 'Gbenga Elufisan')}\n${URL}?via=copy`,
    );
  });

  it('closes from its close button', async () => {
    const user = userEvent.setup();
    const p = renderModal();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(p.onClose).toHaveBeenCalled();
  });
});
