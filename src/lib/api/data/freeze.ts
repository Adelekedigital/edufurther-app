'use client';

import { useMutationState } from '@tanstack/react-query';
import { useState } from 'react';
import { normaliseError } from './errors';

/**
 * The error, or the failure it carries as its `cause` (a save's own error
 * type keeps the API's one there), is the freeze's 409.
 */
export function refusedForReview(error: unknown): boolean {
  if (normaliseError(error).kind === 'inReview') return true;
  const cause = error instanceof Error ? error.cause : undefined;
  return cause !== undefined && normaliseError(cause).kind === 'inReview';
}

/**
 * When the latest save made since this page opened was refused by the review
 * freeze (409 /problems/mentor-application-in-review), or null. Every write
 * the freeze covers answers that way (backend, 21 Oct: photo, cover,
 * headline, About, topics, background, education, awards), so one watch
 * covers all of them. Earlier refusals don't count: the decision may have
 * come since. A time, not a flag, so the page can let one go and still see a
 * newer one.
 */
export function useInReviewRefusal(): number | null {
  const [since] = useState(() => Date.now());
  const times = useMutationState({
    filters: { status: 'error' },
    select: (m) =>
      m.state.submittedAt >= since && refusedForReview(m.state.error) ? m.state.submittedAt : 0,
  });
  const latest = Math.max(0, ...times);
  return latest || null;
}
