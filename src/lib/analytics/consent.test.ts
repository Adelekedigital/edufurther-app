import {
  CONSENT_COOKIE,
  CONSENT_VERSION,
  cookieDomain,
  formatConsent,
  fromServer,
  isCurrent,
  parseConsent,
  readConsentCookie,
  reconcile,
  writeConsentCookie,
} from './consent';
import { consentStore, resetConsentStoreForTests } from './consentStore';

const at = (s: number) => s * 1000;
const yes = (t = 100) => ({ granted: true, version: CONSENT_VERSION, answeredAt: at(t) });
const no = (t = 100) => ({ granted: false, version: CONSENT_VERSION, answeredAt: at(t) });

afterEach(() => {
  document.cookie = `${CONSENT_COOKIE}=; Path=/; Max-Age=0`;
  resetConsentStoreForTests();
});

describe('the consent cookie value', () => {
  it('round-trips an answer', () => {
    expect(parseConsent(formatConsent(yes(1700000000)))).toEqual(yes(1700000000));
    expect(parseConsent(formatConsent(no(5)))).toEqual(no(5));
  });

  it.each(['', 'yes', '2026.2.5', 'v1.1', 'v 1.1.5', 'v1.1.5.6', `${'a'.repeat(33)}.1.5`])(
    'refuses %j',
    (raw) => {
      expect(parseConsent(raw)).toBeNull();
    },
  );

  it('treats an answer to another version as unanswered', () => {
    expect(isCurrent(yes())).toBe(true);
    expect(isCurrent({ ...yes(), version: 'older' })).toBe(false);
    expect(isCurrent(null)).toBe(false);
  });
});

describe('cookieDomain', () => {
  it('shares the answer with the landing site on edufurther.org', () => {
    expect(cookieDomain('app.edufurther.org')).toBe('.edufurther.org');
    expect(cookieDomain('edufurther.org')).toBe('.edufurther.org');
    expect(cookieDomain('EDUFURTHER.ORG')).toBe('.edufurther.org');
  });

  it('stays host-only elsewhere', () => {
    expect(cookieDomain('localhost')).toBeNull();
    expect(cookieDomain('x.vercel.app')).toBeNull();
    expect(cookieDomain('edufurther.org.evil.com')).toBeNull();
    expect(cookieDomain('notedufurther.org')).toBeNull();
  });
});

describe('reading and writing the cookie', () => {
  it('writes what it reads back', () => {
    writeConsentCookie(no(1700000000));
    expect(document.cookie).toContain(`${CONSENT_COOKIE}=${CONSENT_VERSION}.0.1700000000`);
    expect(readConsentCookie()).toEqual(no(1700000000));
  });

  it('reads nothing when there is no cookie, or a foreign value', () => {
    expect(readConsentCookie()).toBeNull();
    document.cookie = `${CONSENT_COOKIE}=garbage; Path=/`;
    expect(readConsentCookie()).toBeNull();
  });

  it('the store answers to the text in force, writes the cookie and tells subscribers', () => {
    const heard = vi.fn();
    consentStore.subscribe(heard);
    expect(consentStore.get()).toBeNull();
    const a = consentStore.answer(true, at(1700000000));
    expect(a).toEqual(yes(1700000000));
    expect(heard).toHaveBeenCalledTimes(1);
    expect(readConsentCookie()).toEqual(a);
    expect(consentStore.getServer()).toBeNull();
  });
});

describe('reconcile: the newest answer wins', () => {
  it('nothing anywhere: unanswered', () => {
    expect(reconcile(null, null)).toEqual({ answer: null, push: false, write: false });
  });

  it('only the device answered: the account is told', () => {
    expect(reconcile(yes(), null)).toEqual({ answer: yes(), push: true, write: false });
  });

  it('only the account answered: the device follows', () => {
    expect(reconcile(null, no())).toEqual({ answer: no(), push: false, write: true });
  });

  it('a newer device answer (the landing site) replaces the account one', () => {
    expect(reconcile(no(200), yes(100))).toEqual({ answer: no(200), push: true, write: false });
  });

  it('a newer account answer (another device) replaces the device one', () => {
    expect(reconcile(no(100), yes(200))).toEqual({ answer: yes(200), push: false, write: true });
  });

  it('agreement sends and writes nothing', () => {
    expect(reconcile(yes(200), yes(100))).toEqual({ answer: yes(200), push: false, write: false });
    expect(reconcile(yes(100), yes(200))).toEqual({ answer: yes(200), push: false, write: false });
  });

  it('an outdated version on either side counts as none', () => {
    const old = { ...yes(300), version: 'old' };
    expect(reconcile(old, no(100)).answer).toEqual(no(100));
    expect(reconcile(no(100), old)).toEqual({ answer: no(100), push: true, write: false });
  });

  it('reads the account answer from /me', () => {
    expect(
      fromServer({ granted: true, version: 'v', answered_at: '1970-01-01T00:01:40Z' }),
    ).toEqual({ granted: true, version: 'v', answeredAt: 100_000 });
    expect(fromServer(null)).toBeNull();
    expect(fromServer(undefined)).toBeNull();
  });
});
