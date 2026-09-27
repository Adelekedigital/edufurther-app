---
name: forms-validation
description: Form standards for React — schema-first validation shared with the contract, when to validate, error message wording and placement, submit and pending states, server-side field errors, multi-step flows, unsaved-change guards, and autofill and input semantics. Use when building or reviewing any form, adding a field, wiring validation, handling a 422, building a wizard, or when a form loses the user's input.
---

# Forms and validation

A form is the place users hand you work they cannot easily redo. Losing it is the
worst thing this layer can do.

## Schema first

One schema per form, defined once, used for types, client validation, and the
server's shape.

```ts
export const profileSchema = z.object({
  displayName: z.string().trim().min(1, 'Enter a display name').max(60),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  bio: z.string().max(280).optional(),
  role: z.enum(['viewer', 'editor', 'admin']),
});
export type ProfileInput = z.infer<typeof profileSchema>;
```

- Derive the TypeScript type from the schema, never the reverse.
- `trim()` before validating, or " a@b.com " fails for a reason the user cannot
  see.
- The message lives **in the schema**, so the same wording appears wherever the
  rule is broken.
- Client validation is a courtesy. The server validates too, always — see
  `security-checker`.

## When to validate

| Moment | Validate |
|---|---|
| On change | never for errors; use it for *clearing* an error the user has now fixed |
| On blur | yes — the field the user just left |
| On submit | everything |
| While typing, after a first failed submit | yes for that field only |

Validating on every keystroke tells someone their email is invalid when they have
typed two characters. Blur-then-submit is the pattern that does not fight the
user.

Async validation (is this name taken?) is debounced, cancellable, and never blocks
submit — check on blur, and let the server be the authority.

## Error messages

| Rule | Bad | Good |
|---|---|---|
| Say what to do | "Invalid input" | "Enter a valid email address" |
| Be specific about limits | "Too long" | "Keep this under 280 characters" |
| No jargon | "Field failed regex" | "Use letters, numbers and hyphens only" |
| Never blame | "You entered it wrong" | "This doesn't look like a phone number" |
| Preserve their input | clearing the field | leave it, mark it |

Place the message **after the label, before or adjacent to the input**, and wire
it up:

```tsx
<label htmlFor="email">Email</label>
{error && <p id="email-error" role="alert">{error}</p>}
<input
  id="email"
  type="email"
  autoComplete="email"
  aria-invalid={Boolean(error) || undefined}
  aria-describedby={error ? 'email-error' : hint ? 'email-hint' : undefined}
/>
```

A red border with no text fails colour-alone; an error not referenced by
`aria-describedby` is invisible to a screen reader.

## Submit

```tsx
<Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
  {isSubmitting ? 'Saving…' : 'Save changes'}
</Button>
```

- **Disable the submit while in flight**, or you will get duplicate writes. Pair
  it with an idempotency key on anything that charges or creates.
- Do not disable submit because the form is invalid. A user who cannot press the
  button gets no explanation. Let them submit, then focus the first error.
- **On failure, keep everything they typed.** Clearing a form because the request
  failed is indefensible.
- On success: navigate, or show a confirmation in a live region. A form that
  silently resets looks like it did nothing.

### Focus the first error

```ts
const onSubmit = async (values) => {
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    setErrors(toFieldErrors(parsed.error));
    document.getElementById(String(first.path[0]))?.focus();
    return;
  }
  …
};
```

An error summary at the top is worth adding for long forms — as a list of links to
each invalid field, in a `role="alert"` region.

## Server field errors

A 422 carries per-field messages. Map them onto the same fields the client
validated, so the two systems look like one.

```ts
catch (err) {
  const e = normaliseError(err);            // see data-layer
  if (e.kind === 'validation' && e.fields) {
    setErrors(e.fields);
    focusFirst(Object.keys(e.fields));
    return;
  }
  setFormError(e.message);                   // non-field failure
}
```

Anything that is not a field error goes in a form-level `role="alert"`, not a
toast that disappears before it is read.

## Input semantics and autofill

Getting these right is the cheapest usability win in the product.

```tsx
<input type="email"    autoComplete="email" inputMode="email" />
<input type="tel"      autoComplete="tel"   inputMode="tel" />
<input type="password" autoComplete="current-password" />
<input type="password" autoComplete="new-password" />
<input type="text"     autoComplete="one-time-code" inputMode="numeric" />
<input type="text"     inputMode="numeric" pattern="[0-9]*" />   {/* not type=number */}
```

- `type="number"` for things that are not quantities (postcodes, card numbers,
  OTPs) gives you spinners, scroll-wheel edits, and lost leading zeros.
- Never block paste. Not on password, not on OTP, not on a card field.
- Never `maxLength` a field whose real limit is a format you have not explained.

## Multi-step flows

- All state in one place, in the parent. A step owns rendering, not the answer.
- Validate **on leaving a step**, not only at the end.
- Back preserves everything. Deep-linking to step 3 either restores state or
  redirects to step 1 — never renders an empty step 3.
- Show progress with the total: "Step 2 of 4".
- Persist a long flow to `sessionStorage` — and nothing sensitive in it, per
  `security-checker`.
- Announce each step change; move focus to the new step's heading.

## Unsaved changes

```ts
useEffect(() => {
  if (!isDirty) return;
  const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
  window.addEventListener('beforeunload', warn);
  return () => window.removeEventListener('beforeunload', warn);
}, [isDirty]);
```

`beforeunload` covers a tab close. In-app navigation needs your router's own
guard, which is the case people forget — and it is the more common one.

Better still, autosave a draft where the domain allows it, and say when it last
saved.

## Definition of done

- [ ] One schema, driving types, validation, and messages
- [ ] Blur + submit validation; change only clears a fixed error
- [ ] Every field: label, `autoComplete`, `inputMode`, `aria-describedby`
- [ ] Submit disabled while in flight, and not disabled for invalid
- [ ] Failure keeps every value the user typed
- [ ] Server 422 maps onto the same fields; non-field errors shown in the form
- [ ] First invalid field receives focus on failed submit
- [ ] Unsaved-change guard covers in-app navigation, not just tab close
- [ ] Paste works everywhere
- [ ] Keyboard-only pass: fill and submit without touching the mouse
