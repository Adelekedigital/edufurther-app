---
name: performance
description: Measured performance budgets for React/Next.js — LCP, CLS and INP, JS and total transfer weight, images and fonts, code splitting, server versus client components, render cost and memoisation, and list virtualisation. Use when adding a dependency, image, font, or animation, when a page feels slow, when a budget fails in review-page, when choosing between server and client rendering, or before shipping a new route.
---

# Performance

**Page speed is a budget you measure.** `review-page.mjs` exits non-zero when a
budget is exceeded, because a budget nobody measures is a wish in a document.

## The budgets

```json
{ "reviewPage": { "budgets": {
  "lcpMs": 2500, "cls": 0.1, "jsKb": 250, "totalKb": 1000
} } }
```

| Budget | Good | Why this one |
|---|---|---|
| LCP | ≤ 2500ms | when the page looks useful |
| CLS | ≤ 0.1 | whether it stays still while you read |
| JS transferred | ≤ 250kB | the cost you pay before anything is interactive |
| Total transferred | ≤ 1000kB | everything else, mostly images |

**INP is not in the budget** because it needs a real interaction; measure it in the
field. Target ≤ 200ms.

On an existing project, set the budgets to today's numbers and ratchet down.

## Before adding a dependency

Four questions, in order:

1. **What does it cost?** Check bundlephobia or `pnpm why` + the dist size. A
   date library at 70kB to format one timestamp is `Intl.DateTimeFormat`.
2. **Is it tree-shakeable?** ESM with `sideEffects: false`, and you import the
   named export — not the default barrel.
3. **Can it be server-only?** A markdown renderer, a syntax highlighter, a schema
   validator used only on submit: none need to reach the client.
4. **Does the platform already do it?** `Intl`, `URLSearchParams`,
   `structuredClone`, `AbortController`, `crypto.randomUUID`, CSS
   `:has()`/container queries, native `<dialog>`, `loading="lazy"`.

Record the answer in the PR when the dependency is over ~10kB. "It was only 40kB"
is how a 250kB budget becomes 400.

## Images — usually the whole story

Images are typically both the LCP element and most of the total weight.

```tsx
<Image
  src={hero}
  alt="…"
  width={1200} height={630}      // always — this is the CLS fix
  sizes="(max-width: 768px) 100vw, 1200px"
  priority                        // ONLY for the LCP image, at most one per page
  placeholder="blur"
/>
```

| Rule | Reason |
|---|---|
| Always `width`/`height` or `aspect-ratio` | reserved space is what prevents CLS |
| Exactly one `priority` image per page | marking everything priority prioritises nothing |
| `loading="lazy"` below the fold, never on the LCP image | lazy-loading the hero delays LCP |
| Serve AVIF/WebP | typically 30–50% off JPEG |
| `sizes` that matches the layout | without it the browser downloads the largest candidate |
| No 2000px image in a 400px slot | the most common single win in any audit |

## Fonts

```tsx
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-sans' });
```

- Self-host or use the framework's font pipeline. A third-party font request adds
  a DNS + TLS round trip on the critical path.
- `display: 'swap'` — or accept invisible text while the font loads.
- Preload only the one font actually used above the fold.
- Subset. Latin-only is a fraction of the full file.
- Match the fallback's metrics (`size-adjust`, `ascent-override`) or the swap is a
  layout shift.
- **Two weights is usually enough.** Each extra weight is another file.

## Code splitting

Split on **route** first — the framework does this. Then split what is genuinely
conditional:

```tsx
const Editor = dynamic(() => import('@/components/organisms/Editor'), {
  ssr: false,
  loading: () => <EditorSkeleton />,     // sized, or you trade JS for CLS
});
```

Good candidates: a rich text editor, a chart library, a map, a modal's body, an
admin-only panel, anything behind a rarely-taken tab.

Bad candidates: anything above the fold, anything on the critical path, or a 3kB
component — the request overhead exceeds the saving.

## Server vs client

Default to server. A component becomes a client component only when it needs
state, effects, refs, browser APIs, or event handlers.

| Signal | Where |
|---|---|
| Fetches and renders | server |
| `useState`/`useEffect` | client |
| Reads `window`, `localStorage` | client |
| Formats with `Intl` for display | server |
| Heavy dependency used once | server |

Push `'use client'` to the **leaf**. A `'use client'` at the top of a page turns
its whole tree into client JS, including the parts that only render text. Moving
one interactive button into its own client component often removes tens of kB.

## Render cost

Measure before optimising. React DevTools Profiler, then:

| Problem | Fix |
|---|---|
| Whole list re-renders on one item's change | key by id; memo the row; lift state out |
| New object/array/function prop every render | `useMemo`/`useCallback` — only where a memoised child consumes it |
| Expensive derive on every render | `useMemo` with honest deps |
| Context change re-renders everything | split the context; put fast-changing values in their own |
| Every keystroke re-renders the page | keep input state local to the field |

`useMemo` on a cheap computation costs more than it saves. Wrapping everything in
`memo` also costs — the comparison is not free and it hides the real problem.

## Lists

- Paginate before virtualising. Most "slow list" problems are a list that should
  never have had 5000 rows.
- Virtualise past a few hundred rows, and accept the cost: find-in-page, anchor
  links, and Ctrl+F stop working.
- Never index as key on a reorderable list.

## CLS — the four causes

1. Image or video with no reserved dimensions.
2. A font swap with mismatched metrics.
3. Content injected above existing content — banners, cookie bars, async ads.
4. A skeleton whose size differs from the content it becomes.

Number four is the one this package introduces, so the skeleton's dimensions are a
Definition-of-Done item in `ui-states`.

## Diagnosing a slow page, in order

1. `node scripts/review-page.mjs <route>` — get the numbers first.
2. Is the LCP element an image? Is it `priority` and correctly sized?
3. Is JS over budget? Run the bundle analyser and find the biggest import.
4. Is CLS over budget? Screenshot mid-load; find what moves.
5. Is the *server* slow? A fast bundle behind a 2s API is not a frontend problem.
6. Only now reach for memoisation.

Optimising render cost before checking the 900kB hero image is the classic wasted
afternoon.

## Definition of done

- [ ] `review-page.mjs <route>` exits 0 at every width
- [ ] Every image has dimensions; exactly one `priority`
- [ ] New dependency's cost stated in the PR, and it is tree-shakeable
- [ ] `'use client'` is on leaves, not on a page
- [ ] No unmeasured memoisation added "to be safe"
- [ ] If a budget moved, the PR says which number and why
