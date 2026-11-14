/**
 * One Idempotency-Key per booking *attempt* (backend ADR 0024): a retry of the
 * same request re-sends the key, so a timeout can't book twice — but a different
 * time or offering is a new attempt with a new key, or the backend answers 422
 * ("this key already stands for a different request").
 */
export function keyForAttempt(
  current: { key: string; body: string } | null,
  body: string,
  newKey: () => string,
): { key: string; body: string } {
  return current && current.body === body ? current : { key: newKey(), body };
}
