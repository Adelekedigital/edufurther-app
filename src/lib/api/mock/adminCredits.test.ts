import {
  creditLog,
  grantCredits,
  menteeCredits,
  resetMockCredits,
  searchMentees,
} from './adminCredits';

const AMARA = 'a3f2c1d4-2041-4418-9c1e-5b7d4e2f2041';

beforeEach(() => {
  resetMockCredits();
});

describe('mock admin credits', () => {
  it('searches email, name or the exact id; empty is the latest movers', () => {
    expect(searchMentees('OKAFOR').map((m) => m.first_name)).toEqual(['Amara']);
    expect(searchMentees(AMARA)).toHaveLength(1);
    expect(searchMentees('ibrahim')).toEqual([]);
    expect(searchMentees('')[0]?.first_name).toBe('Funmi');
  });

  it('every seeded balance stays at or above zero, history newest first', () => {
    const all = creditLog('all', null, null)!.data;
    expect(all.every((e) => e.balance_after >= 0)).toBe(true);
    const ats = all.map((e) => e.at);
    expect([...ats].sort().reverse()).toEqual(ats);
  });

  it('a grant moves the balance and the log, once per key', () => {
    const before = menteeCredits(AMARA)!.mentee.credits;
    expect(before).toMatchObject({ balance: 1, allowance: 3 });
    grantCredits('k1', { user_ids: [AMARA], quantity: 3, note: 'Goodwill' });
    grantCredits('k1', { user_ids: [AMARA], quantity: 3, note: 'Goodwill' });
    const after = menteeCredits(AMARA)!;
    expect(after.mentee.credits).toMatchObject({ balance: 4, allowance: 4 });
    expect(after.history[0]).toMatchObject({ kind: 'admin_grant', change: 3, note: 'Goodwill' });
    expect(creditLog('admin', null, null)!.data.map((e) => e.mentee.user_id)).toContain(AMARA);
  });

  it('refuses a quantity over the allowance and names an unknown id', () => {
    expect(grantCredits('k2', { user_ids: [AMARA], quantity: 4 })).toBeNull();
    expect(grantCredits('k3', { user_ids: ['nobody'], quantity: 1 })).toEqual({
      granted: [],
      unresolved: ['nobody'],
      quantity: 1,
    });
  });

  it('filters the log by chip; expired only under All', () => {
    expect(creditLog('refunds', null, null)!.data.every((e) => e.kind === 'refund')).toBe(true);
    expect(creditLog('monthly', null, null)!.data.some((e) => e.kind === 'expired')).toBe(false);
    expect(creditLog('all', null, null)!.data.some((e) => e.kind === 'expired')).toBe(true);
    expect(creditLog('nope', null, null)).toBeNull();
  });
});
