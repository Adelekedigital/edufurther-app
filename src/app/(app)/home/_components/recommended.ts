import type { MentorMatch } from '@/types/onboarding';
import type { Mentor, Topic } from '@/types/mentor';

/** A matched mentor for Recommended: the card plus what they match of the goal. */
export type Recommended = { mentor: Mentor; matchTopics: string[] };

/**
 * Recommended on Home: the mentee's matches, in the backend's order, without
 * anyone already met (they're under Book again). Each card's match box lists
 * the help areas it shares with the goal, in the catalogue's words.
 */
export function recommendedFrom(
  matches: MentorMatch[],
  metIds: ReadonlySet<string>,
  topics: Topic[],
): Recommended[] {
  return matches
    .filter((m) => !metIds.has(m.mentor.id))
    .map((m) => ({
      mentor: m.mentor,
      // Once each, even if two reasons name the same area.
      matchTopics: [
        ...new Set(
          m.reasons.flatMap((r) =>
            r.code === 'help_areas'
              ? r.slugs.flatMap((slug) => topics.find((t) => t.slug === slug)?.label ?? [])
              : [],
          ),
        ),
      ],
    }));
}

/** "Scholarships & funding, Application documents": the goal's help areas, or null when none are known. */
export function goalLineFrom(needIds: string[], topics: Topic[]): string | null {
  const labels = needIds.flatMap((id) => topics.find((t) => t.id === id)?.label ?? []);
  return labels.length ? labels.join(', ') : null;
}
