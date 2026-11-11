import { reportRequestError, startServerErrors } from '@/lib/vendor/errors';

/** Error tracking on the server (lib/vendor/errors); a no-op unless it's on. */
export async function register() {
  await startServerErrors();
}

/** A server render or route handler that threw (Next calls this itself). */
export const onRequestError = reportRequestError;
