'use client';

import { useMutationState } from '@tanstack/react-query';
import { useState } from 'react';
import { normaliseError } from './errors';

/**
 * True once a save made since this page opened was refused by the review
 * freeze (409 /problems/mentor-application-in-review). Every write the
 * freeze covers answers that way (backend, 21 Oct: photo, cover, headline,
 * About, topics, background, education, awards), so one watch covers all of
 * them. Earlier refusals don't count: the decision may have come since.
 */
/**
 * The error, or the failure it carries as its `cause` (a save's own error
 * type keeps the API's one there), is the freeze's 409.
 */
export function refusedForReview(error: unknown): boolean {
  if (normaliseError(error).kind === 'inReview') return true;
  const cause = error instanceof Error ? error.cause : undefined;
  return cause !== undefined && normaliseError(cause).kind === 'inReview';
}

export function useInReviewRefusal(): boolean {
  const [since] = useState(() => Date.now());
  const refused = useMutationState({
    filters: { status: 'error' },
    select: (m) => m.state.submittedAt >= since && refusedForReview(m.state.error),
  });
  return refused.some(Boolean);
}
