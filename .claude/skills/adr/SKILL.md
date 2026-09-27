---
name: adr
description: Write and maintain Architecture Decision Records for frontend work using MADR — state management, rendering strategy, styling approach, a novel interaction, a deliberate design divergence, or any choice with long-term consequences. Use when making a decision that will be expensive to reverse, choosing between libraries or approaches, when asked "why is it built this way", when superseding a prior decision, or when the build workflow flags that a change is a decision rather than an implementation.
---

# Architecture Decision Records

An ADR records a choice that was **not obvious**, so the next person inherits the
reasoning rather than only the result.

## When a change is a decision

| Write an ADR | Don't |
|---|---|
| State management approach, or adding a second one | which variant a button gets |
| Rendering strategy for a route (server, client, static, streamed) | a component's file name |
| Styling system, or introducing a second one | adding a token |
| A dependency that is hard to remove — editor, charts, forms, i18n | a utility you could delete in an hour |
| A novel interaction with no precedent (see `ux-patterns`) | applying a cited pattern as-is |
| A deliberate divergence from the design system that changes behaviour | a value divergence — that is a row in `design-divergence.md` |
| The API contract shape, or a client-generation strategy | a new field |
| Auth/session handling in the browser | a redirect after login |
| A performance budget being raised | meeting an existing one |

The test: **would a competent person six months from now wonder why, and be tempted
to change it back?** If yes, write it down.

## Format — MADR, short

```md
# 0007. Colocate route data fetching in server components

- Status: accepted
- Date: 2026-08-14
- Deciders: @ada, @grace
- Supersedes: —

## Context and problem statement

Every route currently fetches in a client component behind a `useQuery`, which
puts the generated client in the client bundle (180kB of the 420kB budget) and
makes the first paint wait on a round trip the server could have made.

We need list and detail routes to be fast on a cold visit, while keeping the
interactive filtering that the product depends on.

## Decision drivers

- JS budget is 250kB; we are at 420kB
- Filtering must stay instant after first load
- The team knows React Query well; a rewrite of the data layer is not affordable now

## Considered options

1. Fetch in server components, hydrate a client island for filtering
2. Keep client-side fetching, split the generated client per route
3. Move to a framework-native loader abstraction

## Decision

Option 1. Route-level data is fetched in the server component and passed to a
client organism that owns filtering only.

## Consequences

Good:
- Removes the generated client from the initial bundle for read-only routes
- First paint no longer waits on a client round trip

Bad:
- Two data paths now exist: server fetch for first load, React Query for
  interactions. Every new route has to choose, and the choice is easy to get wrong.
- Filtering state no longer survives a full reload unless it is in the URL

Accepted because:
- The bundle saving is measurable now; the second data path is a documented cost
- We will revisit if a third data path appears, or if the two drift in behaviour
```

## The two sections that matter

**Context** must state the problem, not the solution. "We need Zustand" is not a
context; "three components need the same filter state and prop-drilling it crosses
four levels" is.

**Consequences** must list the bad ones. An ADR with only benefits is a
justification, not a record — and it is useless later, because the thing you will
want to know is what you accepted.

## Status lifecycle

```
proposed → accepted → deprecated
                    → superseded by NNNN
```

- Never edit an accepted ADR's decision. Write a new one and mark the old
  `superseded by NNNN`.
- Fixing a typo or adding a link is fine. Changing what was decided is not — the
  value is the record of what was thought at the time.
- The superseding ADR says what changed and why the earlier reasoning no longer
  holds.

## Where they live

```
docs/adr/
├── 0001-use-nextjs-app-router.md
├── 0002-tailwind-with-design-tokens.md
└── 0007-colocate-route-data-fetching.md
```

Four-digit, zero-padded, never reused. Create one with `/adr-new`.

Read `docs/adr/` **before proposing a rewrite.** The most common waste in a
codebase is re-litigating a decision whose constraints are already written down.

## Frontend ADRs worth having from day one

If these are undocumented, the first three months produce three answers to each:

1. Rendering strategy per route type, and who decides
2. State: server cache vs client state vs URL state — which goes where
3. Styling system and how tokens reach components
4. Form and validation library, and why one schema
5. Generated client: how it is generated, and what the seam is
6. Error and empty-state conventions — where the shared components live
7. Auth in the browser: where the token lives, how refresh works
8. i18n approach, even if there is only one language now

Number 2 is the one that causes the most long-term damage when left implicit.

## Keep it short

One page. An ADR nobody reads is worse than none, because it creates the
impression the decision is documented. If it runs past a page, the extra belongs in
a skill or in `project-conventions`.
