import { lastSignInMethod, rememberSignInMethod } from './lastUsed';

beforeEach(() => window.localStorage.clear());

describe('lastUsed', () => {
  it('remembers the method and nothing else', () => {
    expect(lastSignInMethod()).toBeNull();
    rememberSignInMethod('google');
    expect(lastSignInMethod()).toBe('google');
    expect(window.localStorage.getItem('ef-last-sign-in')).toBe('google');
  });

  it('ignores anything it did not write', () => {
    window.localStorage.setItem('ef-last-sign-in', 'password');
    expect(lastSignInMethod()).toBeNull();
  });

  it('reads as no badge when storage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(lastSignInMethod()).toBeNull();
    spy.mockRestore();
  });
});
