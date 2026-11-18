import { canHandOffToSafari, iosMajor, isStandalone } from './standalone';

const IPHONE = (v: string) =>
  `Mozilla/5.0 (iPhone; CPU iPhone OS ${v} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148`;
const IPAD = (v: string) =>
  `Mozilla/5.0 (iPad; CPU OS ${v} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148`;
const MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';

const realUa = navigator.userAgent;
const device = (ua: string, { ios = false, display = false } = {}) => {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
  Object.defineProperty(navigator, 'standalone', { value: ios || undefined, configurable: true });
  window.matchMedia = vi.fn().mockReturnValue({ matches: display }) as never;
};
afterEach(() => device(realUa));

describe('isStandalone', () => {
  it('the manifest display mode or iOS Safari’s home-screen flag', () => {
    device(ANDROID, { display: true });
    expect(isStandalone()).toBe(true);
    device(IPHONE('17_5'), { ios: true });
    expect(isStandalone()).toBe(true);
    device(IPHONE('17_5'));
    expect(isStandalone()).toBe(false);
  });
});

describe('iosMajor', () => {
  it('reads the iPhone, iPad and iPod version; null elsewhere', () => {
    expect(iosMajor(IPHONE('17_5'))).toBe(17);
    expect(iosMajor(IPHONE('18_6'))).toBe(18);
    expect(iosMajor(IPAD('16_1'))).toBe(16);
    expect(iosMajor(MAC)).toBeNull();
    expect(iosMajor(ANDROID)).toBeNull();
  });
});

describe('canHandOffToSafari (ADR 0013)', () => {
  it('only the installed app on iOS 17 or later', () => {
    device(IPHONE('17_0'), { ios: true });
    expect(canHandOffToSafari()).toBe(true);
    device(IPAD('18_2'), { ios: true });
    expect(canHandOffToSafari()).toBe(true);
  });

  it('never in a Safari tab, before iOS 17, on Android, or an iPad asking for the desktop site', () => {
    device(IPHONE('17_5'));
    expect(canHandOffToSafari()).toBe(false);
    device(IPHONE('16_7'), { ios: true });
    expect(canHandOffToSafari()).toBe(false);
    device(ANDROID, { display: true });
    expect(canHandOffToSafari()).toBe(false);
    device(MAC, { ios: true });
    expect(canHandOffToSafari()).toBe(false);
  });
});
