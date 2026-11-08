/**
 * `work`, or null once `ms` have passed, whichever comes first: a step that
 * stalls (a worker that never answers, a server that hangs) can't hold its
 * caller up. The work itself isn't cancelled; its answer is just not waited for.
 */
export function within<T>(ms: number, work: Promise<T>): Promise<T | null> {
  return Promise.race([work, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
}
