import { lockScroll } from './scrollLock';

function setWidths(inner: number, client: number) {
  vi.stubGlobal('innerWidth', inner);
  Object.defineProperty(document.documentElement, 'clientWidth', {
    configurable: true,
    value: client,
  });
}

describe('lockScroll', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.removeAttribute('style');
  });

  it('pads the body by the scrollbar it hides, so the page keeps its width', () => {
    setWidths(1440, 1425);
    const release = lockScroll();
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.paddingRight).toBe('15px');
    // Fixed elements read the same gap (--fixed-center-x, --fixed-edge-gap).
    expect(document.documentElement.style.getPropertyValue('--scroll-lock-gap')).toBe('15px');
    release();
    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.paddingRight).toBe('');
    expect(document.documentElement.style.getPropertyValue('--scroll-lock-gap')).toBe('');
  });

  it('adds no padding where the scrollbar takes no room (phones, overlay scrollbars)', () => {
    setWidths(390, 390);
    const release = lockScroll();
    expect(document.body.style.paddingRight).toBe('');
    release();
  });

  it('stays locked until the last holder releases, and restores what was there', () => {
    setWidths(1440, 1425);
    document.body.style.overflow = 'clip';
    const outer = lockScroll();
    const inner = lockScroll();
    inner();
    inner(); // a second call is a no-op, not a second release
    expect(document.body.style.overflow).toBe('hidden');
    outer();
    expect(document.body.style.overflow).toBe('clip');
    expect(document.body.style.paddingRight).toBe('');
  });
});
