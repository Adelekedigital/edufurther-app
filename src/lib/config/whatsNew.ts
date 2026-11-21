/**
 * "What's new" tours (ADR 0014): one global switch, off by default, beside
 * each release's own `enabled` (lib/copy/whatsNew). Off, no tour shows and
 * there is no replay entry anywhere. Read at build time: a redeploy to change.
 */
export const WHATS_NEW_LIVE = process.env.NEXT_PUBLIC_WHATS_NEW_ENABLED === 'true';
