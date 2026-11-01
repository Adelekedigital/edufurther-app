// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const vercel = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8')) as Record<
  string,
  unknown
>;

describe('vercel.json', () => {
  it('sends request bodies past the proxy, so uploads up to 5 MB aren’t refused at 4.5 MB (ADR 0003)', () => {
    // src/proxy.ts forwards /api/v1 and runs as a function on Vercel. Without
    // this, any body over 4.5 MB gets 413 FUNCTION_PAYLOAD_TOO_LARGE before it
    // reaches the backend. The proxy must therefore never read a request body.
    expect(vercel.skipMiddlewareRequestBody).toBe(true);
  });
});
