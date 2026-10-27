import {
  addedToast,
  CONFIRM_COPY,
  entryWording,
  FIND_COPY,
  signedChange,
  type EntryFacts,
} from './adminCredits';

const facts = (f: Partial<EntryFacts>): EntryFacts => ({
  kind: 'booking',
  refundReason: null,
  menteeFirstName: 'Amara',
  mentorName: 'Ibrahim Adele',
  adminName: null,
  note: null,
  ...f,
});

describe('entryWording', () => {
  it('a booking names the mentor and is by the mentee', () => {
    expect(entryWording(facts({}))).toEqual({
      what: 'Booked a session with Ibrahim Adele',
      by: 'Amara',
      type: 'bookings',
    });
  });

  it.each([
    ['mentor_canceled', 'Refunded: Ibrahim Adele canceled'],
    ['mentee_canceled', 'Refunded: session canceled'],
    ['canceled', 'Refunded: session canceled'],
    ['mentor_no_show', 'Refunded: Ibrahim Adele didn’t join'],
    ['request_unfulfilled', 'Refunded: request not accepted'],
  ] as const)('a refund for %s reads "%s", by System', (refundReason, what) => {
    expect(entryWording(facts({ kind: 'refund', refundReason }))).toEqual({
      what,
      by: 'System',
      type: 'refunds',
    });
  });

  it.each([
    ['monthly_free', 'Monthly reset'],
    ['profile_completed', 'Starter credit'],
    ['referral_unlock', 'Unlocked: invited a friend'],
    ['opening_balance', 'Opening balance'],
  ] as const)('%s is "%s" under Monthly and starter', (kind, what) => {
    expect(entryWording(facts({ kind }))).toEqual({ what, by: 'System', type: 'monthly' });
  });

  it('expired is under no chip but All', () => {
    expect(entryWording(facts({ kind: 'expired' }))).toEqual({
      what: 'Credits expired',
      by: 'System',
      type: null,
    });
  });

  it('an admin grant is by the admin, with the reason when there is one', () => {
    const grant = facts({ kind: 'admin_grant', adminName: 'Kemi Ade' });
    expect(entryWording(grant)).toMatchObject({
      what: 'Added by admin',
      by: 'Kemi Ade',
      type: 'admin',
    });
    expect(entryWording({ ...grant, note: 'Mentor no-show' }).what).toBe(
      'Added by admin · Mentor no-show',
    );
  });

  it('a deleted account is never "null"', () => {
    expect(entryWording(facts({ mentorName: null, menteeFirstName: null }))).toMatchObject({
      what: 'Booked a session',
      by: 'Deleted account',
    });
    expect(
      entryWording(facts({ kind: 'refund', refundReason: 'mentor_canceled', mentorName: null }))
        .what,
    ).toBe('Refunded: mentor canceled');
    expect(entryWording(facts({ kind: 'admin_grant', adminName: null })).by).toBe(
      'Deleted account',
    );
  });
});

describe('credit counts', () => {
  it('say credit or credits, it or them', () => {
    expect(addedToast(1, 'Amara Okafor')).toBe('1 credit added for Amara Okafor');
    expect(addedToast(3, 'Amara Okafor')).toBe('3 credits added for Amara Okafor');
    expect(CONFIRM_COPY.title(1, 'Amara')).toBe('Add 1 credit for Amara?');
    expect(CONFIRM_COPY.body(2, 'Nov 1')).toBe(
      'They can use them right away. Added credits reset with the rest on Nov 1.',
    );
    expect(CONFIRM_COPY.body(1, 'Nov 1')).toMatch(/^They can use it right away/);
    expect(FIND_COPY.matches(1)).toBe('1 match');
    expect(FIND_COPY.matches(0)).toBe('0 matches');
    expect(signedChange(2)).toBe('+2');
    expect(signedChange(-1)).toBe('-1');
  });
});
