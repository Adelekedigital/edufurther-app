/** Case- and accent-insensitive, so "cote" finds Côte d’Ivoire. Every text search uses it. */
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const WORD_CHAR = /[\p{L}\p{N}]/u;

/**
 * How well `label` matches an already-normalised `q`: 0 starts with it, 1 a word
 * in it does ("South Africa" for "a"), 2 holds it elsewhere, -1 no match.
 */
function matchTier(label: string, q: string): number {
  const hay = norm(label);
  let at = hay.indexOf(q);
  if (at < 0) return -1;
  if (at === 0) return 0;
  while (at >= 0) {
    if (!WORD_CHAR.test(hay[at - 1]!)) return 1;
    at = hay.indexOf(q, at + 1);
  }
  return 2;
}

/**
 * The one in-memory pick-list search: keeps the items that hold `term`, those
 * whose label starts with it first, then a word start, then anywhere, so typing
 * "n" brings Nigeria up rather than Argentina. Stable within a tier. Items that
 * match only `getFallback` (e.g. a description) come last. Server-searched lists
 * keep the server's order and do not use this.
 */
export function rankByMatch<T>(
  items: readonly T[],
  term: string,
  getLabel: (item: T) => string,
  getFallback?: (item: T) => string,
): T[] {
  const q = norm(term.trim());
  if (!q) return [...items];
  const tiers: T[][] = [[], [], [], []];
  for (const item of items) {
    const tier = matchTier(getLabel(item), q);
    if (tier >= 0) tiers[tier]!.push(item);
    else if (getFallback && norm(getFallback(item)).includes(q)) tiers[3]!.push(item);
  }
  return tiers.flat();
}

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
