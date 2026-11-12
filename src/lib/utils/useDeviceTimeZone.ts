'use client';

import { deviceTimeZone } from './format';
import { useHydrated } from './useHydrated';

/**
 * The zone the server renders in. Vercel's functions run in UTC, so a screen's
 * first client paint has to use it too, or every viewer elsewhere gets a
 * hydration mismatch (React #418, E2E issue 574).
 */
export const FIRST_PAINT_ZONE = 'UTC';

/**
 * The device's time zone once the client is running; `null` on the server and
 * for the first paint. A screen that needs a zone straight away renders
 * `?? FIRST_PAINT_ZONE` and switches to the device's after hydration.
 */
export function useDeviceTimeZone(): string | null {
  return useHydrated() ? deviceTimeZone() : null;
}
