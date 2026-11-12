const track = vi.hoisted(() => vi.fn());
vi.mock('./track', () => ({ track }));

import { INSTALL_SENT_KEY, isStandalone, reportInstallOnce } from './install';

const standalone = (on: boolean) => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: on }) as never;
};

beforeEach(() => {
  track.mockReset();
  track.mockReturnValue(true);
  localStorage.clear();
  Object.defineProperty(navigator, 'standalone', { value: undefined, configurable: true });
  standalone(false);
});

describe('pwa_installed: a device’s first launch of the installed app (owner, 2026-11-12)', () => {
  it('in a browser tab: nothing', () => {
    reportInstallOnce();
    expect(track).not.toHaveBeenCalled();
  });

  it('standalone: sent once, then never again on this device', () => {
    standalone(true);
    reportInstallOnce();
    reportInstallOnce();
    expect(track.mock.calls).toEqual([['pwa_installed', { method: 'standalone_launch' }]]);
    expect(localStorage.getItem(INSTALL_SENT_KEY)).toBe('1');
  });

  it('iPhone and iPad: Safari’s home-screen flag counts too', () => {
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
    expect(isStandalone()).toBe(true);
    reportInstallOnce();
    expect(track).toHaveBeenCalledTimes(1);
  });

  it('not taken (analytics off, a preview): no flag, so a later launch sends it', () => {
    standalone(true);
    track.mockReturnValue(false);
    reportInstallOnce();
    expect(localStorage.getItem(INSTALL_SENT_KEY)).toBeNull();
    track.mockReturnValue(true);
    reportInstallOnce();
    expect(track).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem(INSTALL_SENT_KEY)).toBe('1');
  });

  it('storage that throws: nothing sent, rather than one on every launch', () => {
    standalone(true);
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    reportInstallOnce();
    expect(track).not.toHaveBeenCalled();
    set.mockRestore();
  });
});
