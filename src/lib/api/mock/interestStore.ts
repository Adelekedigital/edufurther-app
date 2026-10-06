/**
 * "Tell me when this ships" (ENABLE_MOCK_API=1).
 *
 * **Nothing is stored anywhere real until backend #365 merges.** This store is
 * one dev process's memory and goes when it restarts — it exists so the button
 * can be built and driven, not so it can be relied on.
 *
 *   MOCK_INTEREST=present   pretend #365 has merged (default: it has not)
 */
type Row = { feature: string; registered_at: string };

const rows: Row[] = [];

/**
 * Opt-in, like MOCK_CALENDAR: the default is what production actually does,
 * so the state every mentor sees today is not the one behind a flag nobody
 * sets.
 */
export function endpointExists(): boolean {
  return process.env.MOCK_INTEREST === 'present';
}

export function listInterest(): Row[] {
  return rows;
}

/** 204 on success, 422 on a malformed slug — case is folded, whitespace is not. */
export function addInterest(body: unknown): number {
  const raw = (body as { feature?: unknown } | null)?.feature;
  // {0,39}: one leading letter plus up to 39 more. {1,39} would refuse a
  // single-character slug the real endpoint accepts.
  if (typeof raw !== 'string' || !/^[a-z][a-z0-9_]{0,39}$/i.test(raw)) return 422;
  const feature = raw.toLowerCase();
  // Unique on (account, feature): a repeat keeps the first time asked.
  if (!rows.some((r) => r.feature === feature))
    rows.push({ feature, registered_at: new Date().toISOString() });
  return 204;
}
