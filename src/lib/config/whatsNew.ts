/**
 * "What's new" tours (ADR 0014), one flag per release, off by default. Off,
 * the tour never shows and Settings has no replay row for it.
 */
export const WHATS_NEW_LIVE = process.env.NEXT_PUBLIC_WHATS_NEW_ENABLED === 'true';
