import { LOCK_MS, MAX_TRIES, codeTries, recordMiss, resetTries } from './codeLock';

const A = 'amara@example.com';
const B = 'kwame@example.com';
const T0 = 1_800_000_000_000;

beforeEach(() => {
  window.sessionStorage.clear();
  resetTries(A, T0 + 10 * LOCK_MS);
});

describe('codeLock', () => {
  it('starts with five tries', () => {
    expect(codeTries(A, T0)).toEqual({ triesLeft: MAX_TRIES, lockedUntil: null });
  });

  it('counts down on each miss and locks on the fifth for 15 minutes', () => {
    expect(recordMiss(A, T0).triesLeft).toBe(4);
    recordMiss(A, T0);
    recordMiss(A, T0);
    expect(recordMiss(A, T0)).toEqual({ triesLeft: 1, lockedUntil: null });
    expect(recordMiss(A, T0)).toEqual({ triesLeft: 0, lockedUntil: T0 + LOCK_MS });
    expect(codeTries(A, T0 + LOCK_MS - 1).lockedUntil).toBe(T0 + LOCK_MS);
  });

  it('lifts the lock once 15 minutes have passed', () => {
    for (let i = 0; i < MAX_TRIES; i++) recordMiss(A, T0);
    expect(codeTries(A, T0 + LOCK_MS)).toEqual({ triesLeft: MAX_TRIES, lockedUntil: null });
  });

  it('starts again on a new code, but a new code never lifts a lock', () => {
    recordMiss(A, T0);
    resetTries(A, T0);
    expect(codeTries(A, T0).triesLeft).toBe(MAX_TRIES);
    for (let i = 0; i < MAX_TRIES; i++) recordMiss(A, T0);
    resetTries(A, T0);
    expect(codeTries(A, T0).lockedUntil).toBe(T0 + LOCK_MS);
  });

  it('keeps one address’s count from another', () => {
    recordMiss(A, T0);
    expect(codeTries(B, T0).triesLeft).toBe(MAX_TRIES);
  });

  it('survives a reload of the tab, without storing the address', () => {
    recordMiss(A, T0);
    const stored = window.sessionStorage.getItem('ef-code-tries') ?? '';
    expect(stored).not.toContain('amara');
    expect(JSON.parse(stored).misses).toBe(1);
  });

  it('still counts on this page when storage throws', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(recordMiss(A, T0).triesLeft).toBe(4);
    expect(codeTries(A, T0).triesLeft).toBe(4);
    get.mockRestore();
    set.mockRestore();
  });
});
