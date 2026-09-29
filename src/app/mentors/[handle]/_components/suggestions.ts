import { inSentence } from '@/lib/utils/format';
import type { SimilarMentor } from '@/types/mentor';

/**
 * The suggestions' subtitle from what they share with the missing profile:
 * "They help with visa interview, and CV review, and are taking bookings."
 * Provisional (the design's sample names four topics and says "have open times
 * now", which the list doesn't promise: it's bookable mentors, not free times).
 */
export function suggestionsLine(list: SimilarMentor[]): string {
  const topics = [...new Set(list.map((x) => x.sharedTopic).filter(Boolean))]
    .slice(0, 3)
    .map(inSentence);
  if (!topics.length) return 'They are taking bookings.';
  // Commas between topics, and before the last "and": topic names have their
  // own "and"s ("visa and interview"), so each stays whole.
  const joined =
    topics.length === 1 ? topics[0]! : `${topics.slice(0, -1).join(', ')}, and ${topics.at(-1)}`;
  return `They help with ${joined}, and are taking bookings.`;
}

/** "Booking, track record and similar mentors" from the parts present; null for none. */
export function listLabel(parts: (string | false)[]): string | null {
  const p = parts.filter((x): x is string => !!x);
  if (!p.length) return null;
  const text = p.length === 1 ? p[0]! : `${p.slice(0, -1).join(', ')} and ${p.at(-1)}`;
  return text[0]!.toUpperCase() + text.slice(1);
}
