import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { INVITE_LANDING_COPY } from '@/lib/copy/invite';
import { InviteModal } from './InviteModal';
import { track } from '@/lib/analytics/track';

vi.mock('@/lib/analytics/track', async (orig) => ({
  ...(await orig<typeof import('@/lib/analytics/track')>()),
  track: vi.fn(),
}));
/** The link_shared events sent so far (PRD 30 adoption metric). */
const shares = () =>
  vi
    .mocked(track)
    .mock.calls.filter(([e]) => e === 'link_shared')
    .map(([, p]) => p);
beforeEach(() => vi.mocked(track).mockClear());

const URL = 'https://app.test/invite/damilola-7k2x';

const clip = (writeText: (t: string) => Promise<void>) =>
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
const setShare = (share: ((d: ShareData) => Promise<void>) | undefined) =>
  Object.defineProperty(navigator, 'share', { value: share, configurable: true });
const setCanShare = (canShare: ((d: ShareData) => boolean) | undefined) =>
  Object.defineProperty(navigator, 'canShare', { value: canShare, configurable: true });
/** Lets a rejected share's catch (and the copy after it) run. */
const flush = () => act(async () => {});

function renderModal(over: Partial<ComponentProps<typeof InviteModal>> = {}) {
  const props = {
    url: URL,
    urlLoading: false,
    urlError: false,
    onRetry: vi.fn(),
    friendJoined: false,
    attended: false,
    unlocked: false,
    onShared: vi.fn(),
    onClose: vi.fn(),
    ...over,
  };
  render(<InviteModal {...props} />);
  return props;
}

afterEach(() => {
  setShare(undefined);
  setCanShare(undefined);
  vi.useRealTimers();
});

describe('InviteModal', () => {
  it('is a dialog named by its title and described by its subtitle', () => {
    renderModal();
    const dialog = screen.getByRole('dialog', { name: 'Invite a friend' });
    expect(dialog).toHaveAccessibleDescription('Get 3 free sessions every month.');
  });

  it('shows the link without its scheme', () => {
    renderModal();
    expect(screen.getByText('app.test/invite/damilola-7k2x')).toBeInTheDocument();
  });

  it('locked: both steps to do, and the friend’s free session', () => {
    renderModal();
    const steps = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(steps.map((s) => s.textContent)).toEqual([
      'A friend joins through your link',
      'You attend your first session',
    ]);
    expect(screen.getByText('Your friend gets a free first session.')).toBeInTheDocument();
  });

  it('done steps read in the past tense, with the check', () => {
    renderModal({ friendJoined: true, attended: true });
    const steps = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(steps.map((s) => s.textContent)).toEqual([
      'checkA friend joined and set up their profile',
      'checkYou attended your first session',
    ]);
  });

  it('one step done leaves the other to do', () => {
    renderModal({ friendJoined: true });
    const steps = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(steps[0]).toHaveTextContent('checkA friend joined and set up their profile');
    expect(steps[1]).toHaveTextContent(/^You attend your first session$/);
  });

  it('unlocked: the badge and the reason to share; no steps, no footnote', () => {
    renderModal({ friendJoined: true, attended: true, unlocked: true });
    expect(screen.getByText('You get 3 free sessions a month')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription(
      'Think of someone you’d love to walk this path with. Give them a free first session with a mentor who’s been where they want to go.',
    );
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.queryByText('Your friend gets a free first session.')).toBeNull();
  });

  it('copies the link, says so politely, then reads "Copy invite link" again after 2s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const write = vi.fn().mockResolvedValue(undefined);
    clip(write);
    const p = renderModal();
    await user.click(screen.getByRole('button', { name: 'Copy invite link' }));
    expect(write).toHaveBeenCalledWith(INVITE_LANDING_COPY.message(URL));
    expect(await screen.findByRole('button', { name: 'Link copied' })).toBeInTheDocument();
    expect(screen.getAllByRole('status').some((s) => s.textContent === 'Link copied')).toBe(true);
    expect(p.onShared).toHaveBeenCalledTimes(1);
    expect(shares()).toEqual([{ kind: 'invite', method: 'copy' }]);
    await act(async () => {
      vi.advanceTimersByTime(1900);
    });
    expect(screen.getByRole('button', { name: 'Link copied' })).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByRole('button', { name: 'Copy invite link' })).toBeInTheDocument();
  });

  it('a refused clipboard says so and is not a share', async () => {
    const user = userEvent.setup();
    clip(() => Promise.reject(new Error('denied')));
    const p = renderModal();
    await user.click(screen.getByRole('button', { name: 'Copy invite link' }));
    expect(await screen.findByText('Couldn’t copy the link. Try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy invite link' })).toBeInTheDocument();
    expect(p.onShared).not.toHaveBeenCalled();
    expect(shares()).toEqual([]);
  });

  it('shares through the system sheet with the invite text', async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    setShare(share);
    const p = renderModal();
    await user.click(screen.getByRole('button', { name: 'Share' }));
    expect(share).toHaveBeenCalledWith({ ...INVITE_LANDING_COPY.share, url: URL });
    expect(p.onShared).toHaveBeenCalledTimes(1);
    expect(shares()).toEqual([{ kind: 'invite', method: 'native' }]);
  });

  it('dismissing the share sheet does nothing', async () => {
    const user = userEvent.setup();
    const write = vi.fn().mockResolvedValue(undefined);
    clip(write);
    setShare(() => Promise.reject(Object.assign(new Error('x'), { name: 'AbortError' })));
    const p = renderModal();
    await user.click(screen.getByRole('button', { name: 'Share' }));
    await flush();
    expect(write).not.toHaveBeenCalled();
    expect(p.onShared).not.toHaveBeenCalled();
    // A dismissed sheet is not a share.
    expect(shares()).toEqual([]);
  });

  it('a share the browser refuses falls back to copying', async () => {
    const user = userEvent.setup();
    const write = vi.fn().mockResolvedValue(undefined);
    clip(write);
    setShare(() => Promise.reject(Object.assign(new Error('x'), { name: 'NotAllowedError' })));
    const p = renderModal();
    await user.click(screen.getByRole('button', { name: 'Share' }));
    await flush();
    expect(write).toHaveBeenCalledWith(INVITE_LANDING_COPY.message(URL));
    expect(p.onShared).toHaveBeenCalledTimes(1);
    // Counted once, as what actually happened: a copy.
    expect(shares()).toEqual([{ kind: 'invite', method: 'copy' }]);
  });

  it('a payload the browser can’t share is copied straight away, without the sheet', async () => {
    const user = userEvent.setup();
    const write = vi.fn().mockResolvedValue(undefined);
    const share = vi.fn().mockResolvedValue(undefined);
    clip(write);
    setShare(share);
    setCanShare(() => false);
    renderModal();
    await user.click(screen.getByRole('button', { name: 'Share' }));
    expect(share).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalledWith(INVITE_LANDING_COPY.message(URL));
  });

  it('without a share sheet, Share copies the link instead', async () => {
    const user = userEvent.setup();
    const write = vi.fn().mockResolvedValue(undefined);
    clip(write);
    const p = renderModal();
    await user.click(screen.getByRole('button', { name: 'Share' }));
    expect(write).toHaveBeenCalledWith(INVITE_LANDING_COPY.message(URL));
    expect(await screen.findByRole('button', { name: 'Link copied' })).toBeInTheDocument();
    expect(p.onShared).toHaveBeenCalledTimes(1);
  });

  it('while the link loads: a skeleton, and the buttons do nothing', async () => {
    const user = userEvent.setup();
    const write = vi.fn().mockResolvedValue(undefined);
    clip(write);
    renderModal({ url: null, urlLoading: true });
    expect(screen.getByText('Loading your invite link').parentElement).toHaveAttribute(
      'aria-busy',
      'true',
    );
    const copy = screen.getByRole('button', { name: 'Copy invite link' });
    const share = screen.getByRole('button', { name: 'Share' });
    expect(copy).toHaveAttribute('aria-disabled', 'true');
    expect(share).toHaveAttribute('aria-disabled', 'true');
    await user.click(copy);
    await user.click(share);
    expect(write).not.toHaveBeenCalled();
  });

  it('a turned-off link is never shown or offered', async () => {
    const user = userEvent.setup();
    const write = vi.fn().mockResolvedValue(undefined);
    clip(write);
    renderModal({ linkActive: false });
    expect(screen.getByText('Your invite link is turned off.')).toBeInTheDocument();
    expect(screen.queryByText('app.test/invite/damilola-7k2x')).toBeNull();
    const copy = screen.getByRole('button', { name: 'Copy invite link' });
    expect(copy).toHaveAttribute('aria-disabled', 'true');
    await user.click(copy);
    expect(write).not.toHaveBeenCalled();
  });

  it('a failed link is a notice with Try again', async () => {
    const user = userEvent.setup();
    const p = renderModal({ url: null, urlError: true });
    expect(screen.getByText('We couldn’t load your invite link.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(p.onRetry).toHaveBeenCalledTimes(1);
  });

  it('closes from its close button', async () => {
    const user = userEvent.setup();
    const p = renderModal();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(p.onClose).toHaveBeenCalled();
  });
});

describe('the invite message', () => {
  it('Copy link carries the same words as Share: a blank line, then the invite, then the link on its own line', () => {
    expect(INVITE_LANDING_COPY.message('https://x.test/invite/AB')).toBe(
      'I’m getting help with my grad school applications on EduFurther, from mentors who’ve successfully been through the same process.\n\nJoin me and your first session is free:\nhttps://x.test/invite/AB',
    );
    expect(INVITE_LANDING_COPY.message('u').startsWith(INVITE_LANDING_COPY.share.text)).toBe(true);
  });
});
