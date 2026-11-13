/**
 * The row focus moves to once `removed` has gone: the next one in `order`
 * (the rows as they were at the click) that is still there, else the one
 * before; null when none is left. Worked out when focus moves, not at the
 * click: another delete out at the same time may have taken that neighbour.
 */
export function nextRemaining(
  order: readonly string[],
  removed: string,
  remaining: readonly string[],
): string | null {
  const left = new Set(remaining);
  left.delete(removed);
  const i = order.indexOf(removed);
  const after = order.slice(i + 1).find((id) => left.has(id));
  if (after) return after;
  return (
    order
      .slice(0, Math.max(i, 0))
      .reverse()
      .find((id) => left.has(id)) ?? null
  );
}
