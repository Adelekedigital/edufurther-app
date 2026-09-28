import type { FirstReason } from '@/components/organisms/BookingFlow/BookingFlow';
import { movedBetween } from '@/lib/utils/format';
import type { Mentor } from '@/types/mentor';

/**
 * Explore.dc.html turns on BookingModal's first-mentees box (show-first-reasons)
 * for a new mentor. "New" is the Explore label's own rule (lib/api/data/labels.ts),
 * so the card's label and the box can't disagree. "Got funded." needs the
 * mentor's award on the list API (backend #17): until then only the move shows.
 */
export function firstReasonsFor(m: Mentor): FirstReason[] {
  if (m.label !== 'new') return [];
  const move = movedBetween(m.originCountry, m.studyCountry);
  return move
    ? [
        {
          icon: 'flight_takeoff',
          k: 'Made the move you’re planning.',
          v: `From ${move.from} to ${move.to}.`,
        },
      ]
    : [];
}
