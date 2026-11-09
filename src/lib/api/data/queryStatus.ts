/**
 * What a view that fetches shows: data it has wins, so a background refetch
 * that fails never blanks a loaded list; then the error; else it's loading.
 * Error still comes before empty: data that's there isn't empty.
 */
export const viewStatus = (q: { data: unknown; isError: boolean }) =>
  q.data !== undefined ? ('ready' as const) : q.isError ? ('error' as const) : ('loading' as const);
