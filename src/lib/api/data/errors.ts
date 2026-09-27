import type { AppError } from '@/types/mentor';

/** Thrown by the data layer; carries the HTTP status when there is one. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly title?: string,
  ) {
    super(title ?? `HTTP ${status}`);
  }
}

/**
 * One error shape for every consumer (data-layer skill). Problem Details
 * `detail` is never surfaced: the backend says it is not guaranteed safe
 * (ADR 0016), so copy is ours, chosen by status.
 */
export function normaliseError(error: unknown): AppError {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { kind: 'offline', message: 'You’re offline.' };
  }
  if (error instanceof ApiError) {
    const s = error.status;
    if (s === 401) return { kind: 'unauthorized', message: 'Please log in again.', status: s };
    if (s === 403)
      return { kind: 'forbidden', message: 'You don’t have access to this.', status: s };
    if (s === 404) return { kind: 'notFound', message: 'We couldn’t find that.', status: s };
    if (s === 422) return { kind: 'validation', message: 'That request wasn’t valid.', status: s };
    if (s >= 500)
      return { kind: 'server', message: 'Something went wrong on our side.', status: s };
    return { kind: 'unknown', message: 'Something went wrong.', status: s };
  }
  // fetch() rejects with a TypeError when the network is unreachable.
  if (error instanceof TypeError) {
    return { kind: 'offline', message: 'We couldn’t reach EduFurther.' };
  }
  return { kind: 'unknown', message: 'Something went wrong.' };
}
