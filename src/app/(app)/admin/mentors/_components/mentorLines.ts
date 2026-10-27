import type { ShowUpTier } from '@/lib/api/data/adminMentors';
import { MENTOR_TABLE, SHOW_UP } from '@/lib/copy/adminMentors';
import { waitTone } from './mentorList';

/** "90% · On track", or "No sessions yet" when the API names no tier. */
export function tierLine(rate: number | null, tier: ShowUpTier | null): string {
  return tier && rate != null ? SHOW_UP.pill(rate, SHOW_UP[tier]) : SHOW_UP.none;
}

/** The tier alone, for the drawer's pill under the rate ("On track"). */
export const tierWord = (tier: ShowUpTier | null) => (tier ? SHOW_UP[tier] : SHOW_UP.none);

/** "Waiting 7 days" in its colour (amber from 3, red from 5). */
export const waitLine = (days: number) => ({
  text: MENTOR_TABLE.waiting(days),
  tone: waitTone(days),
});
