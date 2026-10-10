import { describe, expect, it } from 'vitest';
import { SECURITY_HEADERS } from './securityHeaders';

describe('SECURITY_HEADERS', () => {
  it('applies to every route', () => {
    expect(SECURITY_HEADERS.map((h) => h.source)).toEqual(['/:path*']);
  });

  it('states the referrer policy rather than leaving it to the browser default', () => {
    // Only our origin reaches other sites (the meeting host when Join opens a
    // call), never a path like /sessions/{id}.
    const all = SECURITY_HEADERS.flatMap((h) => h.headers);
    expect(all).toContainEqual({
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin',
    });
  });
});
