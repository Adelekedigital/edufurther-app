import { focusIfShown } from './focus';

describe('focusIfShown', () => {
  it('focuses a shown element, skips one inside something hidden', () => {
    document.body.innerHTML =
      '<button id="a">A</button><div hidden><button id="b">B</button></div>';
    const a = document.getElementById('a')!;
    const b = document.getElementById('b')!;
    expect(focusIfShown(b)).toBe(false);
    expect(document.activeElement).not.toBe(b);
    expect(focusIfShown(a)).toBe(true);
    expect(document.activeElement).toBe(a);
    expect(focusIfShown(null)).toBe(false);
  });
});
