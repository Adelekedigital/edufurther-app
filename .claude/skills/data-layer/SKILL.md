---
name: data-layer
description: The client data layer for React apps — query keys, the generated-client seam, caching and invalidation, mutations with optimistic updates and rollback, undo buffers, polling and subscriptions, pagination, request cancellation, and error normalisation. Use when adding a hook, query, or mutation, choosing a cache key, invalidating after a write, building undo, adding polling, or when data looks stale or a list flickers.
---

# Data layer

The seam between the generated client and the UI. Everything about fetching lives
here; nothing about it leaks into a component.

```
lib/api/generated/   ← generated from the contract. Never imported by a component.
lib/api/data/        ← this layer. hooks, keys, mutations, normalisation.
app/**/page.tsx      ← calls the hooks. The only place that fetches.
components/**        ← receives props. Knows nothing.
```

`check-boundaries.mjs` enforces the first and last lines of that diagram.

## Query keys

A key is a contract. Get it wrong and you get either stale data or a cache that
never hits.

```ts
export const keys = {
  profiles: {
    all: ['profiles'] as const,
    list: (filters: ProfileFilters) => ['profiles', 'list', filters] as const,
    detail: (id: string) => ['profiles', 'detail', id] as const,
  },
};
```

Rules:

- **Hierarchical**, general → specific, so you can invalidate a whole subtree.
- **Every input that changes the response is in the key.** A filter left out
  means two different result sets sharing one cache entry.
- **Nothing that doesn't** — no timestamps, no render-scoped objects. An inline
  object literal with a new identity each render defeats the cache.
- Defined in one module. Keys built inline at call sites drift, and then
  invalidation misses.

## Hooks

One hook per resource-and-shape. It returns normalised state, never a raw
response.

```ts
export function useProfiles(filters: ProfileFilters) {
  const query = useQuery({
    queryKey: keys.profiles.list(filters),
    queryFn: ({ signal }) => generated.listProfiles(filters, { signal }),
    staleTime: 30_000,
    select: (res) => res.items.map(toProfile),
  });

  return {
    profiles: query.data,
    isLoading: query.isPending,
    isRefreshing: query.isFetching && !query.isPending,
    error: query.error ? normaliseError(query.error) : null,
    retry: query.refetch,
  };
}
```

- Pass `signal` through so a superseded request is cancelled. Without it a fast
  typist gets results from a query they abandoned.
- `isLoading` (nothing yet) and `isRefreshing` (something on screen) are
  different props to the UI — see `ui-states`.
- Map to a domain type at the boundary. A component typed on the wire shape breaks
  when the contract adds a field.

## staleTime, not magic

| Data | staleTime |
|---|---|
| Reference data (countries, plans) | hours |
| Lists the user edits | 15–60s |
| A detail view they just navigated to | 0–5s |
| Anything with money or availability in it | 0 |

The default of 0 makes every mount a request. Set it deliberately per resource
rather than globally.

## Mutations and invalidation

```ts
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfile) => generated.updateProfile(input),

    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: keys.profiles.detail(input.id) });
      const previous = qc.getQueryData(keys.profiles.detail(input.id));
      qc.setQueryData(keys.profiles.detail(input.id), (old) => ({ ...old, ...input }));
      return { previous };
    },

    onError: (_err, input, ctx) => {
      // The rollback must be visible. A silent revert reads as the app
      // ignoring the click.
      qc.setQueryData(keys.profiles.detail(input.id), ctx?.previous);
      toast.error('Could not save. Your changes were restored.');
    },

    onSettled: (_d, _e, input) => {
      qc.invalidateQueries({ queryKey: keys.profiles.detail(input.id) });
      qc.invalidateQueries({ queryKey: keys.profiles.all });
    },
  });
}
```

### Invalidate what the write actually changed

A write usually touches more than its own key: the detail, every list that could
contain it, and any count or badge derived from it. Miss the count and the user
sees "3 items" above a list of four.

Invalidate the **subtree** (`keys.profiles.all`) unless you have measured that it
is too expensive. Precise invalidation that misses one key is worse than broad
invalidation that refetches one list too many.

### Optimistic updates: only when you can roll back

Apply optimistically when the server almost always agrees and the change is
visible — a toggle, a rename, a reorder. Do not, when the server assigns
something you cannot predict (an id, a computed total, a validation you do not
replicate).

## Undo buffers

Undo is better than a confirmation dialog for anything reversible, and it needs
its own state, not just an optimistic update.

```ts
export function useDeleteWithUndo() {
  const qc = useQueryClient();
  const pending = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  return {
    remove(id: string) {
      // 1. Remove from the cache immediately.
      const previous = qc.getQueryData(keys.profiles.all);
      qc.setQueryData(keys.profiles.all, (old) => without(old, id));

      // 2. Defer the real call, so undo needs no server support.
      const timer = setTimeout(() => {
        pending.current.delete(id);
        generated.deleteProfile(id).catch(() => {
          qc.setQueryData(keys.profiles.all, previous);
          toast.error('Could not delete.');
        });
      }, 5_000);
      pending.current.set(id, timer);

      return () => {                       // undo
        clearTimeout(timer);
        pending.current.delete(id);
        qc.setQueryData(keys.profiles.all, previous);
      };
    },
  };
}
```

Two things people forget: **flush pending deletes on unmount or navigation**, or
the delete silently never happens; and make the undo affordance reachable by
keyboard and announced in a live region.

## Pagination and infinite lists

- Page/cursor goes in the key. Cursor-based beats offset for anything that can be
  inserted into — offset pagination shows duplicates when a row is added above.
- Keep previous data while the next page loads so the list does not collapse.
- Infinite lists need a real "load more" control as well as the intersection
  observer. Keyboard and screen-reader users cannot trigger a scroll sentinel.
- Virtualise past a few hundred rows, and only then — virtualisation breaks
  find-in-page and anchor links.

## Polling and live data

```ts
useQuery({
  queryKey: keys.job.detail(id),
  queryFn: …,
  refetchInterval: (q) => (q.state.data?.status === 'running' ? 2_000 : false),
  refetchIntervalInBackground: false,
});
```

- Stop polling when the resource reaches a terminal state, and when the tab is
  hidden. A forgotten interval is a battery and bill you do not see in dev.
- Prefer refetch-on-focus over a short interval for most screens.
- A websocket updates the cache through `setQueryData`; it does not become a
  second source of truth beside it.

## Error normalisation

One shape, produced here, so every consumer branches on the same thing.

```ts
export type AppError = {
  kind: 'offline' | 'unauthorized' | 'forbidden' | 'notFound' | 'validation' | 'server' | 'unknown';
  message: string;        // safe to show a user
  fields?: Record<string, string>;
  correlationId?: string; // log it; make it copyable, don't shout it
};
```

Components should never parse a status code. `ui-states` branches on `kind`, and
`offline` is a distinct kind because "something went wrong" with the wifi off is
the worst error message in the product.

## Smells

| Smell | Fix |
|---|---|
| `useEffect` + `fetch` + `setState` | a hook in this layer |
| A key built inline at a call site | `keys.*` |
| `refetch()` after every mutation | invalidate; let the cache decide |
| A component importing `lib/api/generated` | level violation |
| `staleTime: Infinity` to stop a flicker | the flicker is a missing `isRefreshing` |
| Response type used as a prop type | map to a domain type at the seam |
| Two hooks fetching the same resource differently | one hook, a `select` per shape |
