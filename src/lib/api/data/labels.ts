import type { MentorLabel } from '@/types/mentor';

/**
 * Mentor label rules, from `Design decisions.md` → "Explore: answers to the
 * frontend handoff request" §9. Highest priority first, at most one per card.
 *
 * Derived here, in one place, because the backend has no `label` field yet
 * (backend reply #5). When it adds one, this function goes and the mapper
 * reads the field instead.
 */
export const LABEL_RULES = {
  topRated: { minRating: 4.8, minReviews: 10 },
  experienced: { minSessions: 50 },
  rising: { maxSessions: 2 },
} as const;

export function deriveLabel(m: {
  rating: number | null;
  reviewCount: number;
  completedSessions: number;
}): MentorLabel | null {
  const r = LABEL_RULES;
  if (
    m.rating !== null &&
    m.rating >= r.topRated.minRating &&
    m.reviewCount >= r.topRated.minReviews
  )
    return 'top-rated';
  if (m.completedSessions >= r.experienced.minSessions) return 'experienced';
  if (m.completedSessions <= r.rising.maxSessions && m.reviewCount === 0) return 'rising';
  return null;
}
