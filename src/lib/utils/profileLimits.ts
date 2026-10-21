/**
 * Server limits (backend, 2026-09-29). About (`about_me`, the mentor About and
 * the mentee bio) is 1,500 and Why I mentor 500 (owner, 2026-10-17).
 */
export const NAME_MAX = 100;
/**
 * A new or edited headline (PRD 19 Oct). The server takes 300, so an
 * unchanged older one that's longer still saves.
 */
export const HEADLINE_MAX = 80;
export const ABOUT_MAX = 1500;
