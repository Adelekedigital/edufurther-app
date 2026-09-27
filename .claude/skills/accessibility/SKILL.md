---
name: accessibility
description: Build-time accessibility for React — semantics and the element that already works, labelling, keyboard operability and focus management, visible focus rings, live regions, colour and contrast, motion, and the dialog/menu/tabs patterns. Use when writing anything interactive or laid out, adding a modal, menu, tabs, or custom control, reviewing a design for contrast or touch targets, or when an axe violation appears.
---

# Accessibility

**Built into the atom, not audited later.** A molecule cannot fix an inaccessible
atom, only wrap it — and retrofitting means auditing every consumer.

This skill fires at build time. If it is firing during a review, something was
skipped.

## The order of operations

1. Use the element that already works.
2. Label it.
3. Make it operable by keyboard.
4. Make the focus visible.
5. Announce what changes.
6. Only then reach for ARIA.

ARIA adds semantics; it never adds behaviour. `role="button"` on a `<div>` gives
you the announcement and none of the Enter/Space handling, the focusability, or
the disabled semantics.

## 1. Semantics

| Need | Element |
|---|---|
| Navigates somewhere | `<a href>` |
| Performs an action | `<button type="button">` |
| Submits | `<button type="submit">` |
| Groups related controls | `<fieldset>` + `<legend>` |
| A list | `<ul>`/`<ol>` + `<li>` |
| Tabular data | `<table>` with `<th scope>` |
| Expandable section | `<button aria-expanded>` + the region |
| Modal | `<dialog>`, or a div with `role="dialog" aria-modal="true"` |

One `<h1>` per page. Heading levels do not skip — a jump from `h2` to `h4` breaks
the document outline screen-reader users navigate by.

Landmarks once each: `<header>`, `<nav>`, `<main>`, `<footer>`. More than one
`<nav>` needs `aria-label` on each.

## 2. Labelling

Every control has an accessible name. In order of preference:

```tsx
<label htmlFor="email">Email</label>
<input id="email" type="email" />          // visible label — best

<button aria-label="Close">×</button>       // icon-only — required

<input aria-labelledby="search-heading" />  // labelled by existing text
```

- `placeholder` is not a label. It disappears on focus and is often too
  low-contrast to read.
- Make the label a **required prop** on icon-only atoms. The type system enforces
  it better than any review.
- Link text must make sense alone: "Read the 2026 report", not "click here".
- `aria-label` on a native element with visible text **overrides** that text.
  Screen reader users then hear something different from what is on screen.

## 3. Keyboard

Everything clickable is reachable and operable by keyboard, in a sensible order.

| Pattern | Keys |
|---|---|
| Button | Enter, Space |
| Link | Enter |
| Checkbox / switch | Space |
| Radio group | arrows move *and* select; Tab enters/leaves the group |
| Select / combobox | arrows, Home/End, type-ahead, Escape |
| Modal | Escape closes; focus trapped inside |
| Menu | arrows, Escape, Tab closes |
| Tabs | arrows between tabs; Tab moves to the panel |

Rules that matter more than the table:

- **DOM order is tab order.** Fix the order in the DOM, not with `tabindex`.
- `tabindex="0"` only on a custom control you have given full keyboard behaviour.
- **Positive `tabindex` is always wrong.** It reorders the whole page.
- `tabindex="-1"` for a programmatic focus target (a heading you move focus to).
- No keyboard trap other than an open modal, and that one releases on Escape.

## 4. Visible focus

A focus ring that is only the browser default gets deleted by the first CSS reset.
Own it, from a token:

```css
:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: 2px;
}
/* Never ship this without a replacement: */
/* *:focus { outline: none } */
```

`review-page.mjs` tabs through the page and flags any stop where nothing visible
changed. That check exists because "we'll style focus later" never survives a
sprint.

### Focus management

| Event | Focus goes to |
|---|---|
| Modal opens | the dialog, or its first control |
| Modal closes | the control that opened it |
| Route change | the `<h1>`, or a `tabindex="-1"` wrapper |
| Item deleted from a list | the next item, or the list heading — never nowhere |
| Validation fails on submit | the first invalid field |
| Async content replaces a region | the region, if the user asked for it |

Focus landing on `<body>` after an interaction means the keyboard user starts over
from the top of the page.

## 5. Announce change

Visual-only change is invisible to a screen reader.

```tsx
<div role="status" aria-live="polite">{saved && 'Changes saved'}</div>
<div role="alert">{error}</div>   {/* assertive — interrupts */}
```

- `polite` for confirmations and counts. `alert`/assertive for errors only.
- The live region must be **in the DOM before** the message appears. Mounting a
  region and its text together usually announces nothing.
- Do not wrap a whole list in a live region; every re-render becomes an
  announcement.
- Result counts after a filter belong in a live region — otherwise the list
  silently changes under the user.

## 6. Colour, contrast, motion, targets

| Requirement | Threshold |
|---|---|
| Body text contrast | 4.5:1 |
| Large text (≥24px, or ≥19px bold) | 3:1 |
| UI component and focus-ring contrast | 3:1 |
| Touch target | 44×44 CSS px, or 24px with spacing |
| Text resize | usable at 200% |
| Reflow | no horizontal scroll at 320px wide |

- **Never colour alone.** A red border needs text or an icon beside it.
- Respect `prefers-reduced-motion`: reduce to opacity, or remove.
- Nothing flashes more than three times a second.
- Disabled controls are exempt from contrast rules — but a disabled control
  nobody can read is still a support ticket. Prefer explaining *why* it is
  disabled.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## The three patterns that are always wrong first

### Modal

```tsx
<div role="dialog" aria-modal="true" aria-labelledby="t">
  <h2 id="t">Edit profile</h2>
  …
</div>
```

- Focus moves in on open, returns to the trigger on close.
- Escape closes. So does the backdrop, if the form has no unsaved input.
- Background is inert — `inert` on the rest of the page, or `aria-hidden`.
- Body scroll locked, without a layout jump from the scrollbar.
- The title is referenced by `aria-labelledby`, not just visually present.

### Menu / dropdown

`aria-expanded` on the trigger, `aria-controls` pointing at the list. Arrows move
within, Escape closes and returns focus, Tab closes. A dropdown that only opens on
hover is unusable by keyboard and touch both.

### Tabs

`role="tablist"` / `tab` / `tabpanel`, `aria-selected`, `aria-controls`, and
roving `tabindex` so Tab enters the group once and arrows move within it. Tabs
built as buttons plus conditional rendering announce nothing.

## Verify

- `node scripts/review-page.mjs <route>` — axe scan, focus-order trace, contrast
- Tab through the whole page yourself. The trace tells you the order; only you
  can tell whether the order makes sense.
- Zoom to 200% and reflow at 320px.
- One pass with the OS screen reader on the primary flow.

An axe pass with zero violations is a floor, not a result — axe cannot tell you
that the tab order is nonsense or that the label is wrong.
