---
name: design-sync
description: Porting a design source into code — importing tokens before components, mapping a design's primitives onto the atomic hierarchy, recording provenance and every deliberate divergence, and handling a redesign or a token rename. Use when porting a screen or component from a design source or design system bundle, when the design contradicts the codebase, when tokens change upstream, or when asked whether the build matches the design.
---

# Design sync

A design is a source, not a specification. Porting it means deciding which parts are
the contract and which are one artboard's accident — and writing down where you
diverged, so the next person does not "fix" it back.

## Order: tokens, then primitives, then the screen

1. **Tokens first.** Colours, spacing, radii, type scale, shadows, motion. Nothing
   else can be ported correctly until these exist, because every component would
   otherwise carry literals.
2. **Primitives next.** The design's buttons, inputs, badges become atoms. Build
   them from the tokens, in isolation, with all their states.
3. **The screen last.** By the time you get here it should be mostly composition.

Porting a screen first produces a screen built from hex values, and then a token
import that changes nothing because nothing references it.

## Importing tokens

Map the design source's token names onto yours **in one file**, and keep the
original name in a comment. That comment is the provenance that survives the next
redesign.

```css
/* styles/tokens/colors.css */
:root {
  /* ds: color/brand/600 */
  --color-brand: #4f46e5;
  /* ds: color/text/primary */
  --color-text: #111827;
  /* ds: color/surface/raised */
  --color-surface-raised: #ffffff;
}
```

| Do | Don't |
|---|---|
| Import the token file verbatim where you can, and layer your aliases on top | hand-copy values into components |
| Keep the upstream name in a comment or a map | rename silently — the next sync becomes a diff you cannot read |
| Add tokens the design lacks (focus ring, disabled) explicitly as *yours* | invent them inline in a component |
| Reference by semantic role (`--color-danger`) | reference by value (`--color-red-500`) in components |

A design source that ships a bundle (`_ds_bundle.js`, `styles.css`, a `tokens/`
directory) is the better import path than reading values off a rendered artboard —
read the token files, not the screenshot.

### Tokens the design will not have

Designs are drawn in the resting state. You will need, and must add deliberately:

- focus ring colour, width, and offset
- disabled and busy treatments
- skeleton/placeholder colour
- the hover and active steps for every interactive token
- a scrim for text over images
- reduced-motion equivalents

Add them to the token file as yours, not into the component. See `accessibility`
for what the focus ring must satisfy.

## Mapping design primitives onto the hierarchy

The design tool's component nesting is not your atomic hierarchy. Map it
deliberately:

| In the design | Usually |
|---|---|
| a text style | a token, not a component |
| a button with 6 variants | one atom, one `variant` prop |
| an input with a label and helper text | a molecule composing an atom |
| a card | an organism, unless it is pure layout |
| a page frame | a template |
| a "modal" frame | a template plus its content organism |

The trap is a design component that bundles layout with content — it becomes an
organism with a margin baked in. Split it: the organism renders content, the parent
owns spacing.

## Read what the selection imports

When you are given a specific file to implement, read the files it imports before
writing anything: the design-system bundle, the stylesheet, and every token file.
They tell you the real values, the real component names, and which primitives
already exist.

Then state what you found before you build:

```
Tokens available: colors (32), fonts (2 families), spacing (9 steps), typography (11 roles)
Primitives used by this screen: Button, Input, Badge, Avatar, Modal shell
Already in our codebase: Button, Input, Badge, Avatar
New: the modal shell → templates/ModalShell.tsx
Missing from the design: error state for the form, focus ring, disabled inputs
```

That paragraph is what turns a port into a checklist.

## Record divergence

Any deliberate difference between the design and the build is recorded. Silent
divergence is how a codebase and a design system drift until neither is trusted.

```md
<!-- project-conventions/references/design-divergence.md -->
| Design | We do | Why | Revisit when |
|---|---|---|---|
| Body text 13px | 14px | 13px fails contrast at our grey; 14px is the smallest that passes | the grey changes |
| Modal closes on backdrop click | only when the form is untouched | backdrop click was losing typed input | never |
| Icon-only action buttons | icon + visible label on mobile | icon alone tested as unrecognisable | a labelled icon set exists |
| Hover-revealed row actions | always visible on touch | hover does not exist on touch | — |
```

The `Revisit when` column is what makes this a record rather than an excuse list.

Divergences that change the product's behaviour get an ADR, not just a row.

## When the design contradicts the design system

Build the **system** version and record the divergence. A one-off that contradicts
the system is a second system, and the second one has no maintainer.

Exception: the design is right and the system is wrong. Then fix the system, in its
own change, and say so — do not smuggle a system change into a screen PR.

## When the design has no state for something

Do not ship an unstyled fallback. Propose copy and a treatment from existing
tokens, mark it provisional, and list it for design:

```
Provisional (needs design):
- error state for the profile form — using ErrorState organism + tokens
- empty state when a filter matches nothing — copy proposed: "No profiles match these filters"
```

`ui-states` says what each state must contain; use it as the list of what to ask
for.

## A redesign, or an upstream token rename

1. Diff the **token files** first, not the screens.
2. A renamed token: update your one mapping file. If components referenced the
   token directly, that is the cost of skipping the mapping layer.
3. A changed value: re-run `review-page.mjs` on the main routes — a palette change
   can break contrast and the axe scan catches it.
4. A removed token: find every consumer before deleting; leave an alias for one
   release with a deprecation comment.
5. Re-check the tokens the design does not own (focus, disabled, skeleton) still
   work against the new values. They are the ones that silently stop being visible.

## Definition of done

- [ ] Tokens imported and referenced semantically; no new literals
- [ ] Every token file the selection imports actually read
- [ ] Design primitives mapped to atomic levels, written down
- [ ] Tokens the design lacks added deliberately as ours
- [ ] Provenance kept — upstream names in comments or a map
- [ ] Every divergence recorded with a reason and a revisit condition
- [ ] Missing states proposed as provisional, and listed for design
- [ ] `check-boundaries.mjs` clean (no raw hex introduced)
- [ ] `review-page.mjs` clean at both widths, contrast included
