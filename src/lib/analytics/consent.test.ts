import {
  SIGNED_OUT_COOKIE,
  effectiveConsent,
  markSignedOut,
  readSignedOut,
  stillValid,
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
  document.cookie = `${SIGNED_OUT_COOKIE}=; Path=/; Max-Age=0`;
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
    expect(consentStore.snapshotServer().answer).toBeNull();
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
    expect(fromServer({ granted: true, version: 'v', answeredAt: '1970-01-01T00:01:40Z' })).toEqual(
      { granted: true, version: 'v', answeredAt: 100_000 },
    );
    expect(fromServer(null)).toBeNull();
    expect(fromServer(undefined)).toBeNull();
  });
});

describe('clocks', () => {
  it('a device time ahead of this clock is read as now', () => {
    writeConsentCookie(yes(9_000_000_000));
    expect(readConsentCookie(at(1000))?.answeredAt).toBe(at(1000));
  });
});

describe('an answer given on this page', () => {
  it('wins over a newer account answer, whatever the clocks say', () => {
    const r = effectiveConsent({
      stored: no(100),
      here: true,
      signedOutAt: null,
      server: { granted: true, version: CONSENT_VERSION, answeredAt: '2100-01-01T00:00:00Z' },
      member: true,
    });
    expect(r).toEqual({ answer: no(100), push: false, write: false });
  });

  it('is kept when the server confirms it with its own time, and not when they changed their mind', () => {
    consentStore.answer(false, at(100));
    consentStore.confirm(no(90));
    expect(consentStore.snapshot()).toEqual({ answer: no(90), here: true });
    consentStore.confirm(yes(95));
    expect(consentStore.get()).toEqual(no(90));
  });

  it('is not replaced by adopting the account answer', () => {
    consentStore.answer(false, at(100));
    consentStore.adopt(yes(200));
    expect(consentStore.get()).toEqual(no(100));
  });
});

describe('shared device: the last log-out', () => {
  it('is kept in its own cookie, never ahead of now', () => {
    expect(readSignedOut()).toBeNull();
    markSignedOut(at(500));
    expect(readSignedOut(at(1000))).toBe(at(500));
    expect(readSignedOut(at(400))).toBe(at(400));
  });

  it('a device answer from before it is unanswered for the next person', () => {
    expect(stillValid(yes(100), at(200))).toBeNull();
    expect(stillValid(yes(300), at(200))).toEqual(yes(300));
    expect(stillValid(yes(100), null)).toEqual(yes(100));
    // A new account: the banner asks, nothing is pushed.
    expect(
      effectiveConsent({
        stored: yes(100),
        here: false,
        signedOutAt: at(200),
        server: null,
        member: true,
      }),
    ).toEqual({ answer: null, push: false, write: false });
    // A guest after the log-out: asked again too.
    expect(
      effectiveConsent({ stored: yes(100), here: false, signedOutAt: at(200), member: false })
        .answer,
    ).toBeNull();
  });

  it('the same person signing back in keeps the answer on their account', () => {
    const r = effectiveConsent({
      stored: yes(100),
      here: false,
      signedOutAt: at(200),
      server: { granted: true, version: CONSENT_VERSION, answeredAt: '1970-01-01T00:01:40Z' },
      member: true,
    });
    expect(r.answer).toEqual(yes(100));
    expect(r.push).toBe(false);
  });
});
