import {
  acquisitionSent,
  cleanUtm,
  markAcquisitionSent,
  forgetAcquisitionSent,
  readArrival,
  rememberArrival,
  resetAcquisitionForTests,
  setAcquisitionPersistence,
  storedAcquisition,
} from './acquisition';

const HOST = 'app.edufurther.org';
beforeEach(() => {
  localStorage.clear();
  resetAcquisitionForTests();
});

describe('cleanUtm: UTM values are untrusted', () => {
  it('keeps a plain value, lower-cased', () => {
    expect(cleanUtm(' LinkedIn ')).toBe('linkedin');
    expect(cleanUtm('spring_2026.v-2')).toBe('spring_2026.v-2');
  });

  it.each(['', null, undefined, '<script>', 'a b', 'a/b', 'x'.repeat(65), 'é'])('drops %j', (v) => {
    expect(cleanUtm(v)).toBeUndefined();
  });

  it('caps at 64 characters', () => {
    expect(cleanUtm('x'.repeat(64))).toBe('x'.repeat(64));
  });
});

describe('readArrival', () => {
  it('an invite path gives the code; the backend decides the inviter', () => {
    expect(readArrival('/invite/AbC_12', '', '', HOST)).toEqual({
      source: 'invite',
      referral_code: 'AbC_12',
    });
  });

  it('an implausible invite code is not kept', () => {
    expect(readArrival('/invite/%3Cx%3E', '', '', HOST)).toBeNull();
  });

  it('campaign tags give the channel', () => {
    expect(readArrival('/explore', '?utm_source=WhatsApp&utm_campaign=x', '', HOST)).toEqual({
      source: 'campaign',
      channel: 'whatsapp',
    });
    expect(readArrival('/', '?utm_campaign=spring', '', HOST)).toEqual({ source: 'campaign' });
    expect(readArrival('/', '?utm_source=%3Cbad%3E', '', HOST)).toBeNull();
  });

  it('another site linking here is a referral; our own sites are not', () => {
    expect(readArrival('/', '', 'https://blog.example.com/post?id=1', HOST)).toEqual({
      source: 'referral_site',
    });
    expect(readArrival('/', '', 'https://edufurther.org/', HOST)).toBeNull();
    expect(readArrival('/', '', `https://${HOST}/home`, HOST)).toBeNull();
    expect(readArrival('/', '', 'not a url', HOST)).toBeNull();
  });

  it('a direct visit is nothing', () => {
    expect(readArrival('/explore', '', '', HOST)).toBeNull();
  });
});

describe('holding the arrival', () => {
  it('keeps the first arrival', () => {
    rememberArrival({ source: 'campaign', channel: 'linkedin' }, 1000);
    rememberArrival({ source: 'referral_site' }, 2000);
    expect(storedAcquisition(3000)).toEqual({ source: 'campaign', channel: 'linkedin' });
  });

  it('a later invite adds its code', () => {
    rememberArrival({ source: 'campaign', channel: 'linkedin' }, 1000);
    rememberArrival({ source: 'invite', referral_code: 'abc' }, 2000);
    expect(storedAcquisition(3000)).toEqual({
      source: 'invite',
      channel: 'linkedin',
      referral_code: 'abc',
    });
  });

  it('expires after 30 days, and drops a tampered value kept from an earlier visit', () => {
    rememberArrival({ source: 'campaign' }, 0);
    expect(storedAcquisition(31 * 24 * 60 * 60_000)).toBeNull();
    localStorage.setItem(
      'ef-acquisition',
      JSON.stringify({ source: 'campaign', channel: '<x>', referral_code: 'a b', at: 0 }),
    );
    expect(storedAcquisition(1)).toEqual({ source: 'campaign' });
    localStorage.setItem('ef-acquisition', JSON.stringify({ source: 'migrated', at: 0 }));
    expect(storedAcquisition(1)).toBeNull();
    localStorage.setItem('ef-acquisition', '{not json');
    expect(storedAcquisition(1)).toBeNull();
  });

  it('writes nothing to the device before Accept', () => {
    rememberArrival({ source: 'campaign', channel: 'linkedin' });
    markAcquisitionSent('u1');
    rememberArrival({ source: 'invite', referral_code: 'abc' });
    expect(localStorage.length).toBe(0);
    expect(acquisitionSent('u1')).toBe(true);
    expect(storedAcquisition()).toEqual({ source: 'invite', referral_code: 'abc' });
  });

  it('once identified, memory goes to the device; a withdrawal removes it again', () => {
    rememberArrival({ source: 'campaign', channel: 'linkedin' });
    setAcquisitionPersistence(true);
    expect(JSON.parse(localStorage.getItem('ef-acquisition')!)).toMatchObject({
      source: 'campaign',
      channel: 'linkedin',
    });
    markAcquisitionSent('u1');
    expect(localStorage.getItem('ef-acquisition-sent')).toBe('["u1"]');
    setAcquisitionPersistence(false);
    expect(localStorage.getItem('ef-acquisition')).toBeNull();
    expect(localStorage.getItem('ef-acquisition-sent')).toBeNull();
  });

  it('log-out forgets who was sent', () => {
    setAcquisitionPersistence(true);
    markAcquisitionSent('u1');
    forgetAcquisitionSent();
    expect(acquisitionSent('u1')).toBe(false);
  });

  it('once sent, the arrival goes and the account is remembered', () => {
    rememberArrival({ source: 'campaign' });
    expect(acquisitionSent('u1')).toBe(false);
    markAcquisitionSent('u1');
    expect(acquisitionSent('u1')).toBe(true);
    expect(acquisitionSent('u2')).toBe(false);
    expect(storedAcquisition()).toBeNull();
  });

  it('survives storage being off', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('off');
    });
    expect(storedAcquisition()).toBeNull();
    expect(acquisitionSent('u1')).toBe(false);
    spy.mockRestore();
  });
});
