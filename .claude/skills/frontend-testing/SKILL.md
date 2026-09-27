---
name: frontend-testing
description: Testing standards for React — the pyramid, what to test and what not to, Testing Library queries and user-event, mocking at the network boundary with MSW, Storybook as the isolation contract, Playwright end-to-end scope, coverage policy, and fixing flaky or hanging tests. Use when writing or reviewing tests, adding a regression test, deciding what to test, setting up MSW or Storybook, when coverage gates fail, or when a test is flaky.
---

# Testing

## The pyramid

| Layer | Share | Runs | Tests |
|---|---|---|---|
| Unit | ~60% | ms | pure functions, schemas, reducers, formatters |
| Component | ~30% | ms | a component's behaviour through the DOM |
| E2E | ~10% | seconds | the two or three flows that must never break |

Plus **Storybook**, which is not a test layer but is the isolation contract — a
component without a story has never been rendered on its own, which means the four
states were assumed rather than looked at.

## Test behaviour, not implementation

The question is always: *what would a user notice if this broke?*

| Test | Don't test |
|---|---|
| the error message appears | that `setState` was called |
| the row disappears after undo expires | the internal timer id |
| submit is disabled while saving | `isSubmitting === true` |
| the correct request was sent | that a mocked hook was called |
| focus moved to the first invalid field | the class name on the wrapper |

A test that asserts on internals fails on a refactor that changed nothing the user
can see. That is the definition of a test with negative value.

## Queries, in order of preference

```tsx
screen.getByRole('button', { name: 'Save changes' })   // 1. how a user finds it
screen.getByLabelText('Email')                          // 2. form fields
screen.getByPlaceholderText('Search')                   // 3. last resort
screen.getByText('No profiles yet')                     // 4. content
screen.getByTestId('profile-row')                       // 5. escape hatch
```

`getByRole` first is not style: a component that cannot be queried by role is a
component a screen reader cannot navigate. The query difficulty *is* the
accessibility finding.

| Query | When |
|---|---|
| `getBy…` | must exist now — throws |
| `queryBy…` | asserting absence — returns null |
| `findBy…` | will exist after async work — awaits |

Never `await waitFor(() => expect(getBy…))` when `findBy` does it. Never
`container.querySelector` — it tests markup, not behaviour.

## user-event, not fireEvent

```tsx
const user = userEvent.setup();
await user.click(screen.getByRole('button', { name: 'Add profile' }));
await user.type(screen.getByLabelText('Email'), 'ada@example.com');
await user.tab();
await user.keyboard('{Escape}');
```

`fireEvent.click` dispatches one event. `user.click` does pointer-down, focus,
pointer-up, click — which is what actually happens, and what catches the handler
attached to the wrong event.

## Mock at the network boundary

MSW, not a mocked hook. Mocking the hook tests your mock; mocking the network tests
your data layer, your error normalisation, and your states.

```ts
export const handlers = [
  http.get('/api/profiles', () => HttpResponse.json({ items: [profileFixture()] })),
];

// in the test that needs a failure
server.use(http.get('/api/profiles', () => new HttpResponse(null, { status: 500 })));
```

Mock only: the network, time (`vi.useFakeTimers`), randomness, and genuinely
unavailable browser APIs. **Never mock the component under test's own children** —
that is how a passing suite ships a broken screen.

## What to test per level

| Level | Test |
|---|---|
| atom | every variant renders; the accessible name exists; disabled blocks the handler; focus ring present |
| molecule | the composed behaviour — typing filters, clearing resets, the label is wired to the input |
| organism | all four states from props; keyboard path through it; long content |
| page | the wiring — a request happens, the right state renders, a retry retries |
| e2e | the flows that must never break |

**Always test the error path.** A suite with no failure cases means the error state
was never rendered, which is exactly where `ui-states` says the bugs are.

## Fixtures

```ts
export const profileFixture = (over: Partial<Profile> = {}): Profile => ({
  id: 'p_1',
  displayName: 'Ada Lovelace',
  email: 'ada@example.com',
  role: 'editor',
  ...over,
});
```

A factory with overrides, so each test states only what it cares about. A shared
mutable fixture object couples tests to each other, and produces the failure that
only happens when the suite runs in a different order.

Keep a deliberately awkward fixture around: a 60-character name, an empty bio, a
missing avatar. It catches more than a dozen tidy ones.

## Storybook

```tsx
export const Loading: Story = { args: { isLoading: true } };
export const Empty: Story   = { args: { items: [] } };
export const Error: Story   = { args: { error: new Error('nope') } };
export const LongContent: Story = { args: { items: [profileFixture({ displayName: 'A'.repeat(60) })] } };
```

Minimum for a shared component: default, every variant, the four states, long
content, narrow viewport, disabled/busy. Run the a11y addon; a violation in a story
is a violation on every screen that uses it.

## End-to-end

Playwright, and **few**. E2E is slow and the first thing to become flaky, so spend
it only on flows where a break is unacceptable:

- sign in and land on the right page
- the product's single core action, end to end
- pay, if you take money

Rules:

- Test against a built app, not a dev server.
- Seed data through the API or a fixture endpoint, never by clicking through setup.
- Use `getByRole`; `page.waitForTimeout` is a bug.
- Each test independent, able to run alone, in any order.
- Trace on first retry — a flake you cannot see is a flake you will not fix.

`review-page.mjs` is not a substitute for E2E and E2E is not a substitute for it:
one drives a flow, the other inspects a page.

## Coverage

- A threshold, set to **current** coverage and ratcheted up. Never lowered to go
  green; if a threshold is wrong, say so and ask.
- Coverage measures execution, not assertion. 90% with no error-path tests is worse
  than 70% with them.
- Do not chase coverage on generated clients, config, or type-only files — exclude
  them and be honest about the remaining number.

## Flaky and hanging tests

| Symptom | Cause |
|---|---|
| Passes alone, fails in the suite | shared mutable state; reset MSW handlers and the query cache between tests |
| Passes locally, fails in CI | timezone, locale, or animation; pin `TZ`, pin locale, disable animation |
| Intermittent timeout | a real unawaited promise — not a reason to raise the timeout |
| "Not wrapped in act" | state settling after the test; use `findBy`/`await user…` instead of `fireEvent` |
| Hangs forever | fake timers with a real `await`; advance the timers, or do not fake them here |
| Fails on the second run | test wrote to `localStorage` or IndexedDB and did not clean up |

A retry that makes a test pass has hidden a race, not fixed one. Fix it or delete
it; a quarantined flaky test teaches the team to ignore red.

## Regression tests

Every bug fix gets a test that **fails before the fix**. Watch it fail first — a
regression test that never failed is asserting something other than the bug.

Assert the positive case too. "Does not crash" passes on a blank screen.

## Definition of done

- [ ] New behaviour covered at the lowest level that can see it
- [ ] Error and empty paths tested, not only success
- [ ] Queries are role-based where possible
- [ ] Network mocked at the boundary; no mocked children
- [ ] Stories exist for the four states and long content
- [ ] Bug fix has a test that failed first
- [ ] No coverage threshold lowered
- [ ] Suite passes with the order shuffled
