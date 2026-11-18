const track = vi.hoisted(() => vi.fn());
vi.mock('@/lib/analytics/track', () => ({ track }));

import {
  acceptInstall,
  captureInstallPrompt,
  closeInstall,
  installNudgeBusy,
  notePushAskShown,
  installPlatform,
  isIosSafari,
  MAX_DISMISSALS,
  mayAutoShow,
  noteInstallMoment,
  NUDGE_KEY,
  openInstallNudge,
  PHONE_QUERY,
  REST_DAYS,
  resetInstallNudgeForTests,
  SHOWN_KEY,
  showPending,
} from './installNudge';

const UA = {
  iosSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  iosChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1',
  iosFirefox:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/127.0 Mobile/15E148 Safari/605.1.15',
  iosInstagram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0',
  ipadOs:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  android:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36',
};

const DAY = 86_400_000;

function device({ phone = true, standalone = false, ua = UA.android, touch = 5 } = {}) {
  window.matchMedia = vi.fn((q: string) => ({
    matches: q === PHONE_QUERY ? phone : q.includes('standalone') ? standalone : false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as never;
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
  Object.defineProperty(navigator, 'maxTouchPoints', { value: touch, configurable: true });
  Object.defineProperty(navigator, 'standalone', { value: undefined, configurable: true });
}

/** The browser offers an install prompt; its answer is `outcome`. */
function offerPrompt(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const e = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: string }>;
  };
  e.prompt = vi.fn(() => Promise.resolve());
  e.userChoice = Promise.resolve({ outcome });
  window.dispatchEvent(e);
  return e;
}

let stop: () => void;
beforeEach(() => {
  resetInstallNudgeForTests();
  track.mockReset();
  localStorage.clear();
  sessionStorage.clear();
  device();
  stop = captureInstallPrompt();
});
afterEach(() => {
  stop();
  vi.restoreAllMocks();
});

const events = () => track.mock.calls.map((c) => [c[0], c[1]]);

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

describe('how often it shows by itself', () => {
  beforeEach(() => {
    offerPrompt();
  });

  it('once per visit', () => {
    noteInstallMoment({ trigger: 'booking', name: 'Ada' });
    expect(showPending()).toBe(true);
    closeInstall();
    noteInstallMoment({ trigger: 'message', name: 'Ada' });
    expect(showPending()).toBe(false);
    expect(sessionStorage.getItem(SHOWN_KEY)).toBe('1');
  });

  it(`a dismiss rests it ${REST_DAYS} days, then it may show again`, () => {
    const now = Date.now();
    noteInstallMoment({ trigger: 'booking' });
    showPending();
    closeInstall();
    sessionStorage.clear();
    resetInstallNudgeForTests();
    expect(mayAutoShow(now + (REST_DAYS - 1) * DAY)).toBe(false);
    expect(mayAutoShow(now + REST_DAYS * DAY + 1000)).toBe(true);
  });

  it(`after ${MAX_DISMISSALS} dismisses it never shows by itself again`, () => {
    localStorage.setItem(NUDGE_KEY, JSON.stringify({ dismissed: MAX_DISMISSALS, restUntil: 0 }));
    expect(mayAutoShow(Date.now() + 365 * DAY)).toBe(false);
    localStorage.setItem(
      NUDGE_KEY,
      JSON.stringify({ dismissed: MAX_DISMISSALS - 1, restUntil: 0 }),
    );
    expect(mayAutoShow()).toBe(true);
  });

  it('each dismiss (the close button, Escape, the backdrop) counts one', () => {
    noteInstallMoment({ trigger: 'booking' });
    showPending();
    closeInstall();
    expect(JSON.parse(localStorage.getItem(NUDGE_KEY)!).dismissed).toBe(1);
  });

  it('storage that fails: never shows', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    noteInstallMoment({ trigger: 'booking' });
    expect(showPending()).toBe(false);
  });

  it('a garbled record reads as fresh', () => {
    localStorage.setItem(NUDGE_KEY, '{not json');
    expect(mayAutoShow()).toBe(true);
    localStorage.setItem(NUDGE_KEY, JSON.stringify({ dismissed: 'x' }));
    expect(mayAutoShow()).toBe(true);
  });

  it('one ask per visit: after the push ask, no nudge; after the nudge, the push ask waits', () => {
    noteInstallMoment({ trigger: 'booking' });
    notePushAskShown();
    expect(showPending()).toBe(false);
    noteInstallMoment({ trigger: 'message' });
    expect(installNudgeBusy()).toBe(true);
    resetInstallNudgeForTests();
    sessionStorage.clear();
    expect(installNudgeBusy()).toBe(false);
    offerPrompt();
    noteInstallMoment({ trigger: 'booking' });
    expect(showPending()).toBe(true);
    closeInstall();
    expect(installNudgeBusy()).toBe(true);
  });

  it('a later moment replaces a waiting one', () => {
    noteInstallMoment({ trigger: 'onboarding' });
    noteInstallMoment({ trigger: 'booking', name: 'Ada' });
    showPending();
    expect(events()).toEqual([
      ['install_nudge_shown', { trigger: 'booking', platform: 'android' }],
    ]);
  });

  it('no moment, nothing to show: never on page load', () => {
    expect(showPending()).toBe(false);
    expect(track).not.toHaveBeenCalled();
  });
});

describe('the buttons and what they count', () => {
  it('Android "Add to home screen": the browser’s prompt, accepted', async () => {
    const e = offerPrompt('accepted');
    noteInstallMoment({ trigger: 'message', name: 'Ada' });
    showPending();
    await acceptInstall();
    expect(e.prompt).toHaveBeenCalledTimes(1);
    expect(events()).toEqual([
      ['install_nudge_shown', { trigger: 'message', platform: 'android' }],
      ['install_nudge_accepted', { trigger: 'message', platform: 'android' }],
    ]);
    // The prompt is used once.
    expect(installPlatform()).toBeNull();
  });

  it('Android prompt refused: counted as a dismiss', async () => {
    offerPrompt('dismissed');
    noteInstallMoment({ trigger: 'booking' });
    showPending();
    await acceptInstall();
    expect(events().at(-1)).toEqual([
      'install_nudge_dismissed',
      { trigger: 'booking', platform: 'android', how: 'prompt_dismissed' },
    ]);
    expect(JSON.parse(localStorage.getItem(NUDGE_KEY)!).dismissed).toBe(1);
  });

  it('iPhone: never an accepted event (a tap proves no install; pwa_installed counts it)', async () => {
    device({ ua: UA.iosSafari });
    noteInstallMoment({ trigger: 'onboarding' });
    showPending();
    await acceptInstall();
    expect(events().map(([e]) => e)).toEqual(['install_nudge_shown']);
  });

  it('the close says so', () => {
    offerPrompt();
    noteInstallMoment({ trigger: 'booking' });
    showPending();
    closeInstall();
    expect(events().at(-1)).toEqual([
      'install_nudge_dismissed',
      { trigger: 'booking', platform: 'android', how: 'closed' },
    ]);
  });
});

describe('the More menu’s "Install the app"', () => {
  it('opens it whatever the rules, and closing it there changes none of them', () => {
    offerPrompt();
    localStorage.setItem(NUDGE_KEY, JSON.stringify({ dismissed: MAX_DISMISSALS, restUntil: 0 }));
    openInstallNudge();
    expect(events()).toEqual([['install_nudge_shown', { trigger: 'menu', platform: 'android' }]]);
    closeInstall();
    expect(JSON.parse(localStorage.getItem(NUDGE_KEY)!).dismissed).toBe(MAX_DISMISSALS);
  });

  it('opens nothing where the sheet can’t help', () => {
    openInstallNudge();
    expect(track).not.toHaveBeenCalled();
  });
});
