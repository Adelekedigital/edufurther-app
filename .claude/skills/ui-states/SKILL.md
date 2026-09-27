---
name: ui-states
description: The four states every view that fetches must render — loading, empty, error, content — plus partial and stale data, optimistic states, and what each state's copy must contain. Use when building any view that fetches, when a design only covers the success case, when adding a skeleton, when writing empty-state or error copy, or when reviewing whether a screen handles failure.
---

# The four states

Every view that fetches renders four states. Three of them are where the design
gave you nothing, and all three ship.

```
loading   →   content
          ↘   empty
          ↘   error
```

A component that renders only content is not finished. It is the happy path with
the other three cases deferred to whoever is on call.

## The rule

The component receives the state as props and renders it. It does not fetch, and
it does not decide *when* it is loading — the page's data layer does that.

```tsx
type Props<T> = {
  items: T[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
};

export function ProfileList({ items, isLoading, error, onRetry }: Props<Profile>) {
  if (isLoading) return <ProfileListSkeleton />;
  if (error)     return <ErrorState error={error} onRetry={onRetry} />;
  if (!items?.length) return <EmptyState />;
  return <ul>{items.map((p) => <ProfileRow key={p.id} profile={p} />)}</ul>;
}
```

Order matters: **loading, error, empty, content.** An error checked after empty
renders "nothing here yet" when the request actually failed — the single most
common version of this bug, and the one users misread as data loss.

## Loading

A skeleton, not a spinner, for anything with a known shape.

| Requirement | Why |
|---|---|
| Same dimensions as the content it replaces | a skeleton of the wrong height is a layout shift, which the CLS budget will catch |
| Same number of rows as the typical page | three skeleton rows for a ten-row list is its own jolt |
| `aria-busy="true"` on the region, and a polite live region announcing it | a screen reader otherwise hears silence |
| No skeleton under ~200ms | a flash of skeleton reads as a glitch; delay it or keep the previous content |

A spinner is right when the shape is genuinely unknown, or inside a button during
a submit.

```tsx
<ul aria-busy="true" aria-live="polite" aria-label="Loading profiles">
  {Array.from({ length: 5 }, (_, i) => <SkeletonRow key={i} />)}
</ul>
```

## Empty

Empty is a designed state, not an absence. It has three jobs, and copy that does
only the first is wasted space.

1. **Say what would be here.** "No profiles yet" — not "No data".
2. **Say why it is empty.** First run, or a filter that matched nothing? These
   are different screens.
3. **Offer the next action.** The button that fills it.

**Distinguish the two empties.** Nothing exists yet and nothing matched the
filter need different copy and different actions:

```tsx
if (!items.length) {
  return hasActiveFilters
    ? <EmptyState
        title="No profiles match these filters"
        action={{ label: 'Clear filters', onClick: clearFilters }} />
    : <EmptyState
        title="No profiles yet"
        body="Profiles you add appear here."
        action={{ label: 'Add a profile', onClick: openCreate }} />;
}
```

Shipping one empty state for both is how users conclude their data is gone.

## Error

The error state answers: what failed, whether it is their fault, and what to do
now.

| Do | Don't |
|---|---|
| A human sentence: "We couldn't load your profiles." | the raw message, or a status code |
| A retry that actually retries | a reload-the-page suggestion |
| Distinguish 4xx-you (fix your input) from 5xx-us (try again) | one message for everything |
| Distinguish offline from server error | "something went wrong" when the wifi is off |
| Log the detail with a correlation id | put the id in the user's face without a way to copy it |

```tsx
export function ErrorState({ error, onRetry }: Props) {
  const offline = typeof navigator !== 'undefined' && !navigator.onLine;
  return (
    <div role="alert">
      <h3>{offline ? "You're offline" : "We couldn't load this"}</h3>
      <p>{offline
        ? 'Reconnect and we will try again.'
        : 'This is on our side. Retrying usually works.'}</p>
      {!offline && <Button onClick={onRetry}>Try again</Button>}
    </div>
  );
}
```

`role="alert"` so it is announced. A silently swapped error state is invisible to
anyone not looking at that region.

## Content — and the states inside it

Content is not one state either. The cases that break real screens:

- **One item.** Grids designed for nine look broken with one.
- **Very many.** Does it paginate, virtualise, or lock the tab up?
- **Long strings.** The 60-character name, the 3-line title. Truncate with a
  `title` or a tooltip, never with overflow that the review script will flag.
- **Missing optional fields.** No avatar, no bio — does the row collapse?

These belong in stories. `LongContent` catches more bugs than any other story.

## Two states the four-state model misses

### Stale-while-revalidating

Data on screen, a refresh in flight. Do **not** drop back to the skeleton — that
throws away content the user is reading. Keep the content and mark it refreshing.

```tsx
<div aria-busy={isRefetching}>{/* content stays */}</div>
```

### Partial success

A list loaded, one section failed. Render what you have and show the failure
inline in the section that failed, not as a whole-page error. A page-level error
for a partial failure hides data the user could have used.

## Optimistic and pending

A mutation has its own three: pending, succeeded, failed-and-rolled-back.

- Disable the control and set `aria-busy` — do not just swap the label.
- If you apply the change optimistically, the rollback must be visible. A silent
  revert reads as the app ignoring the click.
- Keep the user's input on failure. Clearing a form because the request failed is
  the cruellest possible default.

See `data-layer` for the mechanics, and `forms-validation` for submit states.

## Definition of done

- [ ] All four states render in Storybook, from props
- [ ] Error is checked **before** empty
- [ ] The two empties (nothing yet / nothing matched) are distinguished
- [ ] Skeleton matches the content's dimensions — no CLS
- [ ] Error has `role="alert"`; loading region has `aria-busy` + a live region
- [ ] Offline reads differently from server error
- [ ] `node scripts/review-page.mjs <route> --states` run, and the screenshot
      opened
- [ ] One-item, many-item, and long-string cases covered
