import { readSignedOut } from './consent';
import { consentStore, resetConsentStoreForTests } from './consentStore';

const clearCookies = () => {
  for (const c of document.cookie.split(';')) {
    const name = c.split('=')[0]?.trim();
    if (name) document.cookie = `${name}=; max-age=0; path=/`;
  }
};

beforeEach(() => {
  clearCookies();
  resetConsentStoreForTests();
});

describe('consentStore.signedOut', () => {
  it('forgets an answer given on this page and records the sign-out, live', () => {
    const heard = vi.fn();
    consentStore.subscribe(heard);
    consentStore.answer(true, Date.now() - 1000);
    expect(consentStore.snapshot().here).toBe(true);

    consentStore.signedOut();

    const s = consentStore.snapshot();
    expect(s.here).toBe(false);
    expect(s.signedOutAt).not.toBeNull();
    expect(readSignedOut()).not.toBeNull();
    // The answer is older than the sign-out, so the next person is unanswered.
    expect(s.answer!.answeredAt).toBeLessThanOrEqual(s.signedOutAt!);
    expect(heard).toHaveBeenCalled();
  });

  it('an answer after the sign-out counts again', () => {
    consentStore.signedOut(Date.now() - 5000);
    consentStore.answer(false);
    const s = consentStore.snapshot();
    expect(s.here).toBe(true);
    expect(s.answer!.answeredAt).toBeGreaterThan(s.signedOutAt!);
  });
});
