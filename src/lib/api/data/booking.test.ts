import { bookingError, keyForAttempt, toSessionType } from './booking';
import { apiError, normaliseError } from './errors';

describe('booking errors (POST /sessions)', () => {
  it('tells insufficient credit apart from a slot taken meanwhile', () => {
    const credit = normaliseError(
      apiError(409, { type: 'https://api.edufurther.com/problems/insufficient-credit' }),
    );
    expect(credit.kind).toBe('noCredit');
    expect(normaliseError(apiError(409, { type: 'about:blank' })).kind).toBe('conflict');
    expect(normaliseError(apiError(409, undefined)).kind).toBe('conflict');
  });

  it('words each case for booking, never with the server’s detail', () => {
    const e = (status: number, body?: unknown) =>
      bookingError(normaliseError(apiError(status, body)));
    expect(e(401).message).toBe('Log in to book this session.');
    expect(e(409).message).toMatch(/just taken/);
    expect(e(422, { detail: 'starts_at 2026… not in grid' }).message).toMatch(/isn’t available/);
    expect(e(422, { detail: 'secret' }).message).not.toMatch(/secret/);
    expect(e(409, { type: '/problems/insufficient-credit' }).message).toMatch(/out of credits/);
    expect(e(500).message).toMatch(/Try again/);
  });
});

describe('keyForAttempt (Idempotency-Key per booking attempt)', () => {
  let n = 0;
  const newKey = () => `k${++n}`;

  it('reuses the key when the same request is retried', () => {
    const first = keyForAttempt(null, 'A', newKey);
    expect(keyForAttempt(first, 'A', newKey).key).toBe(first.key);
  });

  it('mints a new key for a different time or offering', () => {
    const first = keyForAttempt(null, 'A', newKey);
    expect(keyForAttempt(first, 'B', newKey).key).not.toBe(first.key);
  });
});

describe('toSessionType', () => {
  it('maps the offering and asks no questions until the backend ships them', () => {
    // Fields the spec adds as required (#9 topics, #268 questions), spread so the
    // fixture compiles before and after they ship.
    const later = { service_offerings: [], questions: [] };
    const t = toSessionType({
      id: 'st',
      name: 'CV review',
      description: null,
      duration_minutes: 45,
      min_notice_minutes: 1440,
      meeting_venue: 'google_meet',
      ...later,
    });
    expect(t).toEqual({
      id: 'st',
      name: 'CV review',
      durationMin: 45,
      description: '',
      questions: [],
    });
  });
});
