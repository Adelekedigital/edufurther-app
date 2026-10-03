import type { AppError, AppErrorKind } from '@/types/mentor';

/** Thrown by the data layer; carries the HTTP status when there is one. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly title?: string,
    /** Problem Details `type` — e.g. `/problems/insufficient-credit` on a 409. */
    readonly type?: string,
  ) {
    super(title ?? `HTTP ${status}`);
  }
}

/** Reads `title`/`type` from a Problem Details body openapi-fetch parsed as `error`. */
export function apiError(status: number, body: unknown): ApiError {
  const p = (body && typeof body === 'object' ? body : {}) as { title?: unknown; type?: unknown };
  return new ApiError(
    status,
    typeof p.title === 'string' ? p.title : undefined,
    typeof p.type === 'string' ? p.type : undefined,
  );
}

/**
 * The three booking-limit refusals: problem type → our kind and a message that
 * stands on its own. The booking flow words them again with the mentor's name
 * and a link, which only it has.
 */
const BOOKING_LIMITS: [string, AppErrorKind, string][] = [
  ['/problems/booking-overlap', 'bookingOverlap', 'This time overlaps with another session you have.'],
  [
    '/problems/booking-with-mentor-exists',
    'bookingWithMentorExists',
    'You already have a session pending or coming up with this mentor.',
  ],
  [
    '/problems/booking-limit-reached',
    'bookingLimitReached',
    'You already have 2 sessions pending or coming up.',
  ],
];

/**
 * A 4xx is the answer, not a blip: only a server error is worth one more go.
 * Shared so two query hooks cannot drift into different retry behaviour.
 */
export const retryOnce = (count: number, error: unknown) =>
  !(error instanceof ApiError && error.status < 500) && count < 1;

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
    if (s === 409 && error.type?.endsWith('/problems/insufficient-credit'))
      return { kind: 'noCredit', message: 'You’re out of credits.', status: s };
    // The mentee booking limits. Kept apart from plain `conflict` because the
    // generic 409 copy ("that time was just taken, pick another") is advice
    // that cannot succeed for any of them.
    if (s === 409 && error.type) {
      const limit = BOOKING_LIMITS.find(([suffix]) => error.type!.endsWith(suffix));
      if (limit) return { kind: limit[1], message: limit[2], status: s };
    }
    if (s === 409)
      return { kind: 'conflict', message: 'That changed while you were looking.', status: s };
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
