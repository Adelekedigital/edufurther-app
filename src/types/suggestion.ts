/**
 * Moved into `types/booking.ts`, where the rest of this screen's view model
 * lives — it was only ever separate because a parallel branch owned that file.
 * Re-exported here so nothing breaks mid-migration.
 */
export type { BookingSuggestion, SuggestionStatus } from './booking';
