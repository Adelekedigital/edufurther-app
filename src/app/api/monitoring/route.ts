import { tunnel } from '@/lib/vendor/errors';

/**
 * The browser's error reports, forwarded to our Sentry project only (see
 * lib/vendor/errors `tunnel`): same-origin, so ad blockers don't drop them.
 * Outside src/proxy.ts's matcher (api/ other than /api/v1), as Sentry advises.
 */
export const POST = tunnel;
