/** Case- and accent-insensitive, so "cote" finds Côte d’Ivoire. Every text search uses it. */
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * `decodeURIComponent` that never throws: null for a malformed %-sequence
 * (a hand-typed or truncated URL). Callers choose: fall back to the raw value,
 * or treat it as not a link we made.
 */
export function safeDecode(raw: string): string | null {
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}
