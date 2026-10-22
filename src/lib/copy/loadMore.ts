/**
 * The "Show more" footer's words (LoadMore), for every list that pages: Bookings,
 * Explore and the profile's reviews. Each list keeps its own wording.
 */

type Noun = { one: string; other: string };

/**
 * What one click loads: at most a page. "Show 5 more", "Show 2 more reviews".
 * With nothing known about what's left, a full page.
 */
export function showMoreLabel(page: number, left: number | null, noun?: Noun): string {
  const n = left !== null && left > 0 ? Math.min(page, left) : page;
  return noun ? `Show ${n} more ${n === 1 ? noun.one : noun.other}` : `Show ${n} more`;
}

/** "Showing 5 of 13" (or "… of 57 mentors"); "Showing 24" while the total isn't known. */
export function showingCaption(shown: number, total: number | null, noun?: string): string {
  const tail = noun ? ` ${noun}` : '';
  return total !== null
    ? `Showing ${Math.min(shown, total)} of ${total}${tail}`
    : `Showing ${shown}${tail}`;
}

export const LOAD_MORE_COPY = {
  retry: 'Try again',
  reviews: {
    noun: { one: 'review', other: 'reviews' },
    failed: 'We couldn’t load more reviews.',
  },
  mentors: {
    label: 'Show more mentors',
    busy: 'Loading mentors…',
    failed: 'We couldn’t load more mentors.',
    end: 'That’s everyone for now. Try other topics to see more mentors.',
  },
  bookings: {
    failed: 'We couldn’t load more. Try again.',
    offline: 'You’re offline. Try again when you reconnect.',
  },
} as const;
