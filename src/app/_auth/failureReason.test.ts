import { failureReason, parseFailureReason } from './failureReason';

const params = (qs: string) => new URLSearchParams(qs);

describe('failureReason (which way in failed)', () => {
  it('is a dead link when the round trip was the email, however it failed', () => {
    expect(failureReason(params(''))).toBe('link');
    // Supabase answers an expired or reused email link with access_denied too.
    // Reading that as "cancelled at Google" would lose the 6-digit-code advice,
    // which is the only thing that helps here.
    expect(failureReason(params('error=access_denied&error_code=otp_expired'))).toBe('link');
  });

  it('separates cancelling at Google from Google failing', () => {
    expect(failureReason(params('from=google&error=access_denied'))).toBe('google_cancelled');
    expect(failureReason(params('from=google&error=server_error'))).toBe('google_failed');
  });

  it('calls a Google round trip that came back unusable a Google failure', () => {
    // A code that would not exchange sends no `error` at all; without `from`
    // this used to tell them to type a code from an email they never got.
    expect(failureReason(params('from=google'))).toBe('google_failed');
  });

  it('ignores anything else in the URL', () => {
    expect(parseFailureReason('google_cancelled')).toBe('google_cancelled');
    expect(parseFailureReason('../../etc/passwd')).toBeUndefined();
    expect(parseFailureReason(['link', 'link'])).toBeUndefined();
    expect(parseFailureReason(undefined)).toBeUndefined();
  });
});
