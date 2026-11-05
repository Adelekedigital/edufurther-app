import {
  clearInviteCode,
  INVITE_CODE_TTL_MS,
  isInviteCode,
  rememberInviteCode,
  storedInviteCode,
} from './inviteCode';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('isInviteCode', () => {
  it('accepts handles and single-use codes: the backend’s URL-safe alphabet', () => {
    expect(isInviteCode('damilola-7k2x')).toBe(true);
    expect(isInviteCode('friend-a1b2')).toBe(true);
    expect(isInviteCode('Xy3_k-9QbT2mN8vLp0aZcw')).toBe(true);
    expect(isInviteCode('a'.repeat(128))).toBe(true);
  });

  it('refuses anything else', () => {
    for (const bad of [
      '',
      'a'.repeat(129),
      'a b',
      '<script>',
      'a/b',
      'a%2Fb',
      'émile',
      'a.b',
      '"x"',
    ])
      expect(isInviteCode(bad)).toBe(false);
    expect(isInviteCode(null)).toBe(false);
    expect(isInviteCode(42)).toBe(false);
  });
});

describe('the stored invite', () => {
  it('remembers a valid code, then clears it', () => {
    expect(rememberInviteCode('damilola-7k2x')).toBe(true);
    expect(storedInviteCode()).toBe('damilola-7k2x');
    clearInviteCode();
    expect(storedInviteCode()).toBeNull();
  });

  it('keeps a code through day 10: a friend who comes back later still arrives through it', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    rememberInviteCode('damilola-7k2x');
    vi.spyOn(Date, 'now').mockReturnValue(now + 10 * 24 * 60 * 60_000);
    expect(storedInviteCode()).toBe('damilola-7k2x');
    expect(INVITE_CODE_TTL_MS).toBe(30 * 24 * 60 * 60_000);
  });

  it('the latest valid link wins', () => {
    rememberInviteCode('damilola-7k2x');
    rememberInviteCode('tunde-9q4z');
    expect(storedInviteCode()).toBe('tunde-9q4z');
  });

  it('stores nothing for an invalid code', () => {
    expect(rememberInviteCode('<img src=x>')).toBe(false);
    expect(storedInviteCode()).toBeNull();
  });

  it('drops a stored value that fails the test (edited by hand)', () => {
    localStorage.setItem('ef-invite-code', 'x"><b>');
    expect(storedInviteCode()).toBeNull();
    expect(localStorage.getItem('ef-invite-code')).toBeNull();
  });

  it('keeps it 30 days, then forgets it', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    rememberInviteCode('damilola-7k2x');
    vi.spyOn(Date, 'now').mockReturnValue(now + INVITE_CODE_TTL_MS - 1);
    expect(storedInviteCode()).toBe('damilola-7k2x');
    vi.spyOn(Date, 'now').mockReturnValue(now + INVITE_CODE_TTL_MS);
    expect(storedInviteCode()).toBeNull();
    expect(localStorage.getItem('ef-invite-code')).toBeNull();
  });

  it('drops a stored code with no time, or an invalid one in the right shape', () => {
    localStorage.setItem('ef-invite-code', JSON.stringify({ code: 'damilola-7k2x' }));
    expect(storedInviteCode()).toBeNull();
    localStorage.setItem('ef-invite-code', JSON.stringify({ code: 'a/b', at: Date.now() }));
    expect(storedInviteCode()).toBeNull();
  });

  it('with storage off, remembers nothing and never throws', () => {
    const off = () => {
      throw new Error('off');
    };
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(off);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(off);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(off);
    expect(() => rememberInviteCode('damilola-7k2x')).not.toThrow();
    expect(storedInviteCode()).toBeNull();
    expect(() => clearInviteCode()).not.toThrow();
  });
});
