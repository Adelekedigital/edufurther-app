const admit = vi.hoisted(() => vi.fn());
const openFromMenu = vi.hoisted(() => vi.fn());
const resumePending = vi.hoisted(() => vi.fn());
vi.mock('./installNudge', () => ({ admit, openFromMenu, resumePending }));

import { device, offerPrompt, UA } from './_test/installHarness';
import { EARLY_CAPTURE, EARLY_PROMPT } from './earlyPrompt';
import {
  captureInstallPrompt,
  installPlatform,
  isIosSafari,
  noteInstallMoment,
  openInstallNudge,
  PENDING_KEY,
  resetInstallPromptForTests,
  resumeInstallMoment,
} from './installPrompt';

let stop: () => void;
beforeEach(() => {
  resetInstallPromptForTests();
  admit.mockReset();
  openFromMenu.mockReset();
  resumePending.mockReset();
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

  it('a prompt that came before the bundle ran: the layout’s script kept it, and it is adopted', () => {
    stop();
    // The <head> script, run as the browser runs it, then the prompt, then the bundle.
    new Function(EARLY_CAPTURE)();
    const e = offerPrompt();
    expect(e.defaultPrevented).toBe(true);
    expect((window as never)[EARLY_PROMPT]).toBe(e);
    expect(installPlatform()).toBeNull();
    stop = captureInstallPrompt();
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

  it('Safari 26 on iOS 26 (a frozen "iPhone OS 18_6", Version/26.0): the steps', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
    expect(isIosSafari(ua, 5)).toBe(true);
    device({ ua });
    expect(installPlatform()).toBe('ios');
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

describe('a moment kept across a page load', () => {
  it('a page load with one kept: the rules pick it up', async () => {
    device({ ua: UA.iosSafari });
    sessionStorage.setItem(PENDING_KEY, '{}');
    resumeInstallMoment();
    await vi.dynamicImportSettled();
    expect(resumePending).toHaveBeenCalledTimes(1);
  });

  it('none kept, or a device that can’t show it: nothing loads', async () => {
    device({ ua: UA.iosSafari });
    resumeInstallMoment();
    device({ phone: false, ua: UA.iosSafari });
    sessionStorage.setItem(PENDING_KEY, '{}');
    resumeInstallMoment();
    await vi.dynamicImportSettled();
    expect(resumePending).not.toHaveBeenCalled();
  });

  it('Android: a kept moment waits for the page’s prompt, then is picked up', async () => {
    sessionStorage.setItem(PENDING_KEY, '{}');
    resumeInstallMoment();
    await vi.dynamicImportSettled();
    expect(resumePending).not.toHaveBeenCalled();
    offerPrompt();
    await vi.dynamicImportSettled();
    expect(resumePending).toHaveBeenCalledTimes(1);
  });
});
