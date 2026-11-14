import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { track } from '@/lib/analytics/track';
import { INVITE_LINK_SHARE } from '@/lib/copy/invite';
import { MENTOR_SHARE_COPY } from '@/lib/copy/mentorShare';
import { LinkSharePanel, type LinkShareContent } from './LinkSharePanel';

vi.mock('@/lib/analytics/track', async (orig) => ({
  ...(await orig<typeof import('@/lib/analytics/track')>()),
  track: vi.fn(),
}));
const shares = () =>
  vi
    .mocked(track)
    .mock.calls.filter(([e]) => e === 'link_shared')
    .map(([, p]) => p);

const URL = 'https://app.test/mentors/gbenga';
const content: LinkShareContent = MENTOR_SHARE_COPY.panel(false, 'Gbenga Elufisan');

const clip = (writeText: (t: string) => Promise<void>) =>
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
const setShare = (share: ((d: ShareData) => Promise<void>) | undefined) =>
  Object.defineProperty(navigator, 'share', { value: share, configurable: true });
const flush = () => act(async () => {});

function renderPanel(c: LinkShareContent = content) {
  const onShared = vi.fn();
  render(<LinkSharePanel url={URL} content={c} onShared={onShared} />);
  return onShared;
}

beforeEach(() => vi.mocked(track).mockClear());
afterEach(() => setShare(undefined));

describe('LinkSharePanel', () => {
  it('shows the link without its scheme', () => {
    renderPanel();
    expect(screen.getByText('app.test/mentors/gbenga')).toBeInTheDocument();
  });

  it('Copy puts the content’s text on the clipboard, says so, and counts its kind', async () => {
    const user = userEvent.setup();
    const write = vi.fn().mockResolvedValue(undefined);
    clip(write);
    const onShared = renderPanel();
    await user.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(write).toHaveBeenCalledWith(content.copyText(URL));
    expect(await screen.findByRole('button', { name: 'Link copied' })).toBeInTheDocument();
    expect(screen.getAllByRole('status').some((s) => s.textContent === 'Link copied')).toBe(true);
    expect(onShared).toHaveBeenCalledTimes(1);
    expect(shares()).toEqual([{ kind: 'mentor_profile', method: 'copy', own: false }]);
  });

  it('Share hands the share sheet the content’s payload', async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    setShare(share);
    const onShared = renderPanel();
    await user.click(screen.getByRole('button', { name: 'Share' }));
    expect(share).toHaveBeenCalledWith(content.share(URL));
    expect(onShared).toHaveBeenCalledTimes(1);
    expect(shares()).toEqual([{ kind: 'mentor_profile', method: 'native', own: false }]);
  });

  it('without a share sheet, Share copies', async () => {
    const user = userEvent.setup();
    const write = vi.fn().mockResolvedValue(undefined);
    clip(write);
    renderPanel();
    await user.click(screen.getByRole('button', { name: 'Share' }));
    expect(write).toHaveBeenCalledWith(content.copyText(URL));
    expect(shares()).toEqual([{ kind: 'mentor_profile', method: 'copy', own: false }]);
  });

  it('a dismissed share sheet does nothing', async () => {
    const user = userEvent.setup();
    const write = vi.fn().mockResolvedValue(undefined);
    clip(write);
    setShare(() => Promise.reject(Object.assign(new Error('x'), { name: 'AbortError' })));
    const onShared = renderPanel();
    await user.click(screen.getByRole('button', { name: 'Share' }));
    await flush();
    expect(write).not.toHaveBeenCalled();
    expect(onShared).not.toHaveBeenCalled();
    expect(shares()).toEqual([]);
  });

  it('a share that fails otherwise falls back to copying', async () => {
    const user = userEvent.setup();
    const write = vi.fn().mockResolvedValue(undefined);
    clip(write);
    setShare(() => Promise.reject(Object.assign(new Error('x'), { name: 'NotAllowedError' })));
    renderPanel();
    await user.click(screen.getByRole('button', { name: 'Share' }));
    await flush();
    expect(write).toHaveBeenCalledWith(content.copyText(URL));
    expect(shares()).toEqual([{ kind: 'mentor_profile', method: 'copy', own: false }]);
  });

  it('a refused clipboard says so and is not a share', async () => {
    const user = userEvent.setup();
    clip(() => Promise.reject(new Error('denied')));
    const onShared = renderPanel();
    await user.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(await screen.findByText('Couldn’t copy the link. Try again.')).toBeInTheDocument();
    expect(onShared).not.toHaveBeenCalled();
    expect(shares()).toEqual([]);
  });

  it('the invite keeps its own labels and counts as an invite', async () => {
    const user = userEvent.setup();
    clip(vi.fn().mockResolvedValue(undefined));
    renderPanel(INVITE_LINK_SHARE);
    await user.click(screen.getByRole('button', { name: 'Copy invite link' }));
    expect(await screen.findByRole('button', { name: 'Link copied' })).toBeInTheDocument();
    expect(shares()).toEqual([{ kind: 'invite', method: 'copy', own: true }]);
  });

  it('a link that failed to load is a notice with Try again', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <LinkSharePanel
        url={null}
        urlLoading={false}
        urlError
        onRetry={onRetry}
        content={INVITE_LINK_SHARE}
      />,
    );
    expect(screen.getByText('We couldn’t load your invite link.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
