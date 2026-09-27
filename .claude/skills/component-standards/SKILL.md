---
name: component-standards
description: Atomic design implementation standards for React components — what belongs at each level, prop and variant design, composition over configuration, forwarding refs and native props, styling with tokens, and when a variant becomes a new component. Use when writing or styling a component, adding a variant or prop, deciding which atomic level something belongs at, reviewing a component's API, or when a component has grown too many boolean props.
---

# Component standards

## Build bottom-up

atom → molecule → organism → template → page. Every level renders in isolation
before the next one consumes it.

This is the base of implementation, not a filing scheme applied afterwards.
Extraction after the fact produces components shaped like one screen's accident:
props named after that screen's data, states that only exist because that screen
had them, and a second consumer that forks rather than reuses.

## What each level is

| Level | Renders | Owns | Never |
|---|---|---|---|
| **atom** | one element + styling | its own accessible semantics | another component, any data |
| **molecule** | 2–4 atoms as one labelled control | the relationship between them | layout of the page, fetching |
| **organism** | a recognisable region | the four states, from props | where its data came from |
| **template** | slots and spacing | the grid | content, copy |
| **page** | a template filled in | fetching, routing, params | presentational detail |

If you cannot say which level something is, it is doing two jobs. Split it.

## Accessibility lives in the atom

A molecule cannot fix an inaccessible atom, only wrap it. Retrofitting means
auditing every consumer.

So the atom owns:

- The right element. A thing that navigates is `<a>`; a thing that acts is
  `<button>`. `<div onClick>` is not a control.
- Its label contract — either visible text or a required `aria-label` prop the
  type system will not let you omit.
- A focus ring that survives a design change, from a token.
- Disabled *and* busy as distinct states (`disabled`, `aria-busy`).

```tsx
type IconButtonProps = {
  icon: ReactNode;
  /** Required: an icon-only control has no visible text to name it. */
  'aria-label': string;
} & ButtonHTMLAttributes<HTMLButtonElement>;
```

Making the label a required prop is worth more than any review checklist. See
`accessibility` for the rest.

## Props: composition over configuration

A prop that switches *content* is usually a slot. A prop that switches *meaning*
is a variant.

```tsx
// no — configuration creep
<Card title="…" subtitle="…" showFooter footerText="…" badge="new" dense hideIcon />

// yes — composition
<Card>
  <Card.Header>…</Card.Header>
  <Card.Body>…</Card.Body>
  <Card.Footer>…</Card.Footer>
</Card>
```

### The three-boolean rule

Three or more booleans that describe appearance mean you have an enum you have
not named yet.

```tsx
// before
<Button primary large disabled loading />

// after
<Button variant="primary" size="lg" state="loading" />
```

Booleans also multiply: three of them is eight combinations, of which you have
looked at two.

### Variant or new component?

| Signal | Answer |
|---|---|
| Same element, same semantics, different token values | variant |
| Different element or ARIA role | new component |
| A branch inside the render that ignores half the props | new component |
| The name needs "or" to describe it | new component |

`<Button variant="link">` that renders an `<a>` is not a variant. It is a
`<LinkButton>`, and treating it as a variant is how keyboard behaviour and
`href` handling get lost.

## Forward refs and spread native props

An atom that swallows `ref`, `onKeyDown`, `id`, or `aria-*` forces every consumer
to wrap it.

```tsx
export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ invalid, ...rest }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cx(styles.input, invalid && styles.invalid)}
        {...rest}
      />
    );
  },
);
```

Spread `...rest` **last** for native props so a consumer can override, but keep
computed accessibility attributes after it if the component must guarantee them.
Decide deliberately and comment which it is.

## Styling

- Tokens only. No hex, no magic px for spacing. `check-boundaries.mjs` enforces
  the hex half.
- The component owns its internals; the **parent owns its outer margin**. A
  component with `margin-bottom` baked in is unusable in a row.
- Variants map to token sets, not to ad-hoc overrides at the call site.
- `className` is accepted and merged last, so a consumer can position it without
  forking it.

```tsx
// the parent decides spacing
<Stack gap="md"><ProfileRow /><ProfileRow /></Stack>
```

## Every component renders four states

Any component that can receive data renders loading, empty, error, and content —
from props, with no fetching. See `ui-states`; it is the skill that says what each
one must contain.

## Stories are the isolation contract

A component without a story has never been rendered in isolation, which means the
four states were assumed rather than looked at.

Minimum for a shared component:

```
Default
Every variant
Loading / Empty / Error        (if it takes data)
LongContent                     — the 60-character name, the 3-line title
Narrow                          — 390px viewport
Disabled + Busy                 (if interactive)
```

The `LongContent` story catches more real bugs than any other, because designs
are drawn with short names.

## Naming

- Components `PascalCase`, files match the component: `ProfileRow.tsx`.
- Props describe *intent*: `isDestructive`, not `isRed`.
- Handlers `onX` for the prop, `handleX` for the implementation.
- No level in the name. `ProfileRow`, not `ProfileRowMolecule` — the directory
  already says it, and the name would have to change when it is promoted.

## Smells

| Smell | Usually means |
|---|---|
| Prop named after one screen's data (`profiles`) on a shared component | extracted, not designed — generalise to `items` |
| `useEffect` syncing props into state | derived value, not state |
| A component importing `lib/api/generated` | level violation; the page fetches |
| `!important`, or a `z-index` above 100 | the stacking context belongs to a template |
| Two components 90% identical | one component, one variant — or one atom both compose |
| A `styles` prop, or inline style objects | tokens escaped; put it in the variant |
