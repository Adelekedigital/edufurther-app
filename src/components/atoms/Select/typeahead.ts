/** Case- and accent-insensitive, so "cote" finds Côte d’Ivoire. */
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * The row typing should jump to (WAI-ARIA select-only combobox): the next
 * label after `from` that starts with `typed`. One letter typed again and
 * again cycles through the rows starting with it. -1 when none.
 */
export function typeaheadIndex(labels: string[], typed: string, from: number): number {
  const n = labels.length;
  if (!n || !typed) return -1;
  const q = norm(typed);
  const same = q.split('').every((c) => c === q[0]);
  // "aaa" means "the third a", which is the next a after the current one.
  const needle = same ? q[0]! : q;
  // A longer string keeps matching the row it is on; a cycling letter moves on.
  const start = same ? from + 1 : Math.max(from, 0);
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n;
    if (norm(labels[i]!).startsWith(needle)) return i;
  }
  return -1;
}
