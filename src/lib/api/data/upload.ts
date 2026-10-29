import type { AppError } from '@/types/mentor';
import { ApiError, normaliseError, retryAfterMinutes } from './errors';

/**
 * One multipart file body for every upload endpoint (`POST /me/intake-files`,
 * `POST /me/message-files`): a single field, `file`. The generated types call
 * the binary part a string (openapi-typescript and multipart); the serializer
 * sends the File itself.
 */
export function fileBody(file: File) {
  return {
    body: { file } as unknown as { file: string },
    bodySerializer: (b: unknown) => {
      const form = new FormData();
      form.append('file', (b as { file: File }).file);
      return form;
    },
  };
}

/** Our copy for a refused upload, by status; the server's text is never shown. */
export function uploadError(e: unknown): AppError {
  const n = normaliseError(e);
  const s = e instanceof ApiError ? e.status : undefined;
  if (s === 413 || s === 422)
    return { ...n, message: 'Upload a PDF or Word (.docx) file under 5 MB.' };
  if (s === 409)
    return {
      ...n,
      message: 'You have too many files waiting to be used in a booking. Try again tomorrow.',
    };
  if (s === 401) return { ...n, message: 'Log in to upload a file.' };
  // Ten an hour (backend #358). The generic copy ends "Try again", which here
  // is advice that cannot succeed for up to an hour — so say when.
  if (s === 429) {
    const mins = retryAfterMinutes(e instanceof ApiError ? e.retryAfter : undefined);
    return {
      ...n,
      message: mins
        ? `You’ve uploaded a lot of files in the last hour. Try again in ${mins} ${mins === 1 ? 'minute' : 'minutes'}.`
        : 'You’ve uploaded a lot of files in the last hour. Try again a little later.',
    };
  }
  if (s !== undefined && s >= 500)
    return { ...n, message: 'File uploads aren’t available right now. Try again later.' };
  return { ...n, message: `We couldn’t upload it. ${n.message} Try again.` };
}
