---
name: project-structure
description: Atomic directory layout and import direction for React/Next.js projects — where a file goes, which level may import which, when to promote a component to a shared tier, and where the data layer and generated client live. Use when creating a new file, deciding where code belongs, scaffolding a project, resolving a circular import, promoting a local component, or when the boundary checker fails.
---

# Project structure

## The layout

```
src/
├── app/                  routes. the ONLY place that fetches data.
│   └── profiles/
│       ├── page.tsx
│       └── _components/        local to this route, not yet shared
├── components/
│   ├── atoms/            Button, Input, Badge, Avatar, Spinner
│   ├── molecules/        SearchField, FormRow, Pagination
│   ├── organisms/        PostCard, NavBar, ProfileList
│   └── templates/        FeedLayout, AuthLayout — slots, no content
├── lib/
│   ├── api/
│   │   ├── generated/    the generated client. imported by data/ only.
│   │   └── data/         hooks, queries, mutations — the seam
│   ├── vendor/           every third-party SDK enters here
│   └── utils/
├── styles/               tokens. the only place a colour is defined.
└── types/
```

If the repo still uses `ui/ patterns/ states/ layout/`, that is the older naming
for levels 1–4 and the boundary checker understands both. Do not mix schemes in a
new directory; migrate a directory at a time.

## Import direction

```
atom  →  molecule  →  organism  →  template  →  page
```

One way, always. A file may import its own level and anything **below** it, never
above.

| From | May import | May not |
|---|---|---|
| atom | tokens, utils | anything in `components/` |
| molecule | atoms | organisms, templates, pages |
| organism | molecules, atoms | templates, pages |
| template | organisms, molecules, atoms | pages |
| page | everything, plus `lib/api/data` | `lib/api/generated` directly |

**Why it is a hard rule, not a style:** a level that reaches up can no longer
render in isolation. The moment an atom imports an organism, the atom's story
needs the organism's data, and the four states stop being checkable at the level
where they are cheap to check.

## Only the page fetches

`lib/api/generated/` is imported by `lib/api/data/` and nowhere else. Components
receive data as props and emit callbacks.

```tsx
// app/profiles/page.tsx — the seam
const { data, error, isLoading } = useProfiles();
return <ProfileList profiles={data} error={error} isLoading={isLoading} />;

// components/organisms/ProfileList.tsx — no fetching, no client import
export function ProfileList({ profiles, error, isLoading }: Props) { … }
```

One contract change should touch one directory, not thirty components. That is
the whole argument, and `check-boundaries.mjs` enforces it.

## Where does this file go?

Ask in this order and stop at the first yes:

1. **Does it own any layout or business rule?** No → `lib/utils/`.
2. **Does it fetch, cache, or mutate?** Yes → `lib/api/data/`.
3. **Does it render exactly one HTML element plus styling, and no other
   component?** Yes → `atoms/`.
4. **Does it compose 2–4 atoms into one labelled control?** Yes → `molecules/`.
5. **Does it render a list, a card, a header — a recognisable region of a
   screen?** Yes → `organisms/`.
6. **Is it slots and spacing with no content of its own?** Yes → `templates/`.
7. **Is it a route?** Yes → `app/`.

Still unsure between two adjacent levels: pick the **lower** one. Promoting is a
move; demoting means finding every consumer.

## Route-local first, shared second

A component used by one route starts in `app/<route>/_components/`. It is
promoted to `components/` when a **second** route needs it — not when you suspect
one might.

Promotion is a real step, not a drag-and-drop:

- [ ] Remove every assumption about the original route's data shape
- [ ] Props become generic — `items`, not `profiles`
- [ ] It renders all four states from props alone
- [ ] It has a story at its new level
- [ ] Nothing in it imports from `app/`

A component promoted without this is an organism shaped like one screen's
accident, and the second consumer will fork it within a month.

## Circular imports

Almost always a level violation wearing a disguise. `A` imports `B`, `B` imports
`A`, and one of them is reaching up.

The fix is rarely a barrel file:

- Shared type → `types/`
- Shared constant → the token or constants module
- One needs the other's *behaviour* → the behaviour belongs one level down, or
  it belongs in the parent that composes both

## Barrel files

`index.ts` re-exports are allowed **per level** (`components/atoms/index.ts`) and
nowhere else. A root barrel that re-exports the whole component library defeats
tree-shaking and turns every import into a potential cycle.

## Tokens

Colours, spacing, radii, and type scales are defined in `styles/` and referenced
everywhere else. A hex literal in a component is a copy no design update will
ever reach — `check-boundaries.mjs` flags it, and the exceptions list is for
brand assets and icon sets, not for "this one time".

## Vendor seams

Every third-party SDK — analytics, payments, maps, feature flags — is imported in
`lib/vendor/<name>.ts` and re-exported through your own narrow interface. Declare
the seam so it is enforced:

```json
{ "checkBoundaries": { "vendorSeams": { "@vendor/sdk": ["lib/vendor"] } } }
```

An SDK imported in forty components cannot be replaced, version-bumped, or
mocked. One imported in one file can be all three.
