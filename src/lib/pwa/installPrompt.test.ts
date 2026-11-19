const admit = vi.hoisted(() => vi.fn());
const openFromMenu = vi.hoisted(() => vi.fn());
vi.mock('./installNudge', () => ({ admit, openFromMenu }));

import { device, offerPrompt, UA } from './_test/installHarness';
import {
  captureInstallPrompt,
  installPlatform,
  isIosSafari,
  noteInstallMoment,
  openInstallNudge,
  resetInstallPromptForTests,
} from './installPrompt';

let stop: () => void;
beforeEach(() => {
  resetInstallPromptForTests();
  admit.mockReset();
  openFromMenu.mockReset();
  localStorage.clear();
  sessionStorage.clear();
  device();
  stop = captureInstallPrompt();
});
afterEach(() => {
  stop();
  vi.restoreAllMocks();
});

describe('capture', () => {
  it('listens once however often it is asked, so an early prompt is kept by the first listener', () => {
    expect(captureInstallPrompt()).toBe(stop);
    const e = offerPrompt();
    expect(e.defaultPrevented).toBe(true);
    expect(installPlatform()).toBe('android');
  });
});

describe('platform: phone browsers that can install, nothing else', () => {
  it('Android with the browser’s prompt kept: android, and the mini-infobar is held back', () => {
    const e = offerPrompt();
    expect(e.defaultPrevented).toBe(true);
    expect(installPlatform()).toBe('android');
  });

  it('Android with no prompt (installed already, or a browser without one): nothing', () => {
    expect(installPlatform()).toBeNull();
  });

  it('once the app is installed the kept prompt is dropped', () => {
    offerPrompt();
    window.dispatchEvent(new Event('appinstalled'));
    expect(installPlatform()).toBeNull();
  });

  it('the installed app: nothing, even with a prompt', () => {
    device({ standalone: true });
    offerPrompt();
    expect(installPlatform()).toBeNull();
  });

  it('desktop and wide screens: nothing', () => {
    device({ phone: false });
    offerPrompt();
    expect(installPlatform()).toBeNull();
  });

  it('iPhone Safari: the steps', () => {
    device({ ua: UA.iosSafari });
    expect(installPlatform()).toBe('ios');
  });

  it('iPhone Safari already on the home screen: nothing', () => {
    device({ ua: UA.iosSafari });
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
    expect(installPlatform()).toBeNull();
  });

  it('other iPhone browsers and in-app browsers: nothing', () => {
    for (const ua of [UA.iosChrome, UA.iosFirefox, UA.iosInstagram]) {
      device({ ua });
      expect(installPlatform()).toBeNull();
    }
  });

  it('iPadOS Safari reads as a Mac with touch; a real Mac doesn’t', () => {
    expect(isIosSafari(UA.ipadOs, 5)).toBe(true);
    expect(isIosSafari(UA.ipadOs, 0)).toBe(false);
  });
});

describe('handing a moment to the lazy half', () => {
  it('a device that can install: the rules decide there, with where it happened', async () => {
    offerPrompt();
    noteInstallMoment({ trigger: 'booking', name: 'Ada' });
    await vi.dynamicImportSettled();
    expect(admit).toHaveBeenCalledWith({ trigger: 'booking', name: 'Ada' }, location.pathname);
  });

  it('one that can’t: nothing loads', async () => {
    noteInstallMoment({ trigger: 'booking' });
    await vi.dynamicImportSettled();
    expect(admit).not.toHaveBeenCalled();
  });

  it('the More item loads it and opens the sheet; nowhere to install, nothing', async () => {
    await openInstallNudge();
    expect(openFromMenu).not.toHaveBeenCalled();
    offerPrompt();
    await openInstallNudge();
    expect(openFromMenu).toHaveBeenCalledTimes(1);
  });
});
