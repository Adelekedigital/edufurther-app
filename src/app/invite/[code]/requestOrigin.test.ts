import { requestOrigin } from './requestOrigin';

const h = (o: Record<string, string>) => new Headers(o);

describe('requestOrigin', () => {
  it('reads the forwarded host and scheme, first value only', () => {
    expect(
      requestOrigin(
        h({ 'x-forwarded-host': 'app.test, proxy', 'x-forwarded-proto': 'https,http' }),
      ),
    ).toBe('https://app.test');
  });
  it('local hosts default to http, others to https', () => {
    expect(requestOrigin(h({ host: 'localhost:3100' }))).toBe('http://localhost:3100');
    expect(requestOrigin(h({ host: 'app.test' }))).toBe('https://app.test');
  });
});
