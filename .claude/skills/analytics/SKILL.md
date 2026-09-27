---
name: analytics
description: Product analytics standards — a typed event schema, naming, what properties every event carries, identity and anonymous ids, where instrumentation code lives, consent gating, funnels and the metric that answers a question, and debugging a metric that looks wrong. Use when adding tracking, defining an event, instrumenting a new flow, wiring a vendor SDK, gating on consent, or when a number in the dashboard does not match reality.
---

# Analytics

An event you cannot answer a question with is a cost with no benefit. Start from the
question.

## Start from the question

Before adding an event, write the question it answers and who asks it.

```
Question: do users abandon profile setup, and at which field?
Owner:    product
Events:   profile_setup_started, profile_setup_field_completed, profile_setup_submitted
Property: the step index and field name, so the funnel has steps
Decision: if drop-off concentrates on one field, we cut or defer that field.
```

If the last line is missing, the event is decoration. Events added "so we have the
data" are never analysed and never removed.

## A typed schema

One module defines every event and its payload. The type system then stops a
misspelled event name from silently creating a second, half-populated funnel.

```ts
export type AnalyticsEvents = {
  profile_setup_started: { source: 'onboarding' | 'settings' };
  profile_setup_field_completed: { step: number; field: string };
  profile_setup_submitted: { step_count: number; duration_ms: number };
  profile_setup_abandoned: { last_step: number; reason: 'navigated' | 'closed' };
  search_performed: { query_length: number; result_count: number; has_filters: boolean };
};

export function track<K extends keyof AnalyticsEvents>(
  event: K,
  props: AnalyticsEvents[K],
): void { … }
```

Note `query_length`, not `query`. See PII below.

## Naming

- `snake_case`, `object_verb_past_tense`: `profile_created`, `search_performed`.
- The object first, so related events sort together in every tool's list.
- Past tense, because an event is something that happened. `create_profile` reads
  like a command and ends up fired before the thing succeeded.
- Never rename a live event. Add the new name, run both, migrate the dashboards,
  then remove the old one. A rename silently truncates every historical chart.

## Properties every event carries

Set these once, globally, not per call:

| Property | Why |
|---|---|
| `app_version` / build sha | "did the release cause this?" |
| `platform`, `viewport_bucket` | mobile and desktop behave differently |
| `route` / `screen` | where it happened |
| `anonymous_id` | stitching a session without identifying anyone |
| `session_id` | grouping |
| `is_installed` (PWA) | installed traffic behaves differently |

Per event, prefer **counts, lengths, buckets, and enums** over raw values. They are
answerable and they carry far less risk.

## Identity

- An **anonymous id** by default, generated client-side, stored in a first-party
  cookie or `localStorage`.
- On sign-in, `identify` links the anonymous id to an internal user id — never to an
  email, a phone number, or a name.
- On sign-out, reset the anonymous id. Otherwise the next person on that machine
  joins the previous person's session.
- Never put an email or any personal field in a trait or an event property. See
  `security-checker`.

## Where the code lives

```
lib/vendor/analytics.ts     the SDK enters here, and nowhere else
lib/analytics/events.ts     the typed schema
lib/analytics/track.ts      track(), identify(), reset() — your own interface
```

Declare the seam so it is enforced:

```json
{ "checkBoundaries": { "vendorSeams": { "@segment/analytics-next": ["lib/vendor"] } } }
```

### Instrument at the level that knows the meaning

A `track` call inside an atom means every `<Button>` in the product fires it. Fire
from the **handler that knows what happened** — usually the page or the organism.

```tsx
// components/atoms/Button.tsx — knows nothing
export const Button = (props) => <button {...props} />;

// app/profiles/page.tsx — knows what this click means
<Button onClick={() => { track('profile_setup_started', { source: 'onboarding' }); open(); }}>
```

Do not track from inside `useEffect` on mount to mean "viewed" unless you accept
double-fires in development and on remount. Use the router's navigation event for
page views, once, in one place.

## Consent

**Consent gates loading the script, not just sending the event.** A vendor tag that
loaded already has the DOM, the cookies JS can read, and everything in
`localStorage`.

```ts
export async function initAnalytics(consent: Consent) {
  if (!consent.analytics) return;          // nothing is loaded
  const { analytics } = await import('./vendor/analytics');
  await analytics.load();
  flushQueued();
}
```

- Queue events in memory before consent, flush after, drop them if consent is
  refused.
- Withdrawal must stop collection in the same session — not at the next reload.
- Record which consent version applied. "We had consent" is not auditable without
  it.

## Funnels

A funnel needs a start, ordered steps, and both ends. The event people forget is
the abandon.

```
profile_setup_started       → count of people who began
profile_setup_field_completed { step } → where they got to
profile_setup_submitted     → success
profile_setup_abandoned     → failure, with the last step reached
```

Without `abandoned`, drop-off between step 2 and 3 is indistinguishable from
"still in progress", and the number is quietly wrong for every session that is
still open.

Fire the abandon on navigation away and on unmount, with the reason.

## Errors are analytics too

Track the *rate*, not the message:

```ts
track('request_failed', { route, kind: e.kind, status_bucket: '5xx' });
```

A spike in `request_failed` for one route is a product signal you will see before
the error tracker's noise, and it costs one event.

## When a number looks wrong

Check in this order:

1. **Consent** — how many sessions never loaded the SDK at all?
2. **Ad blockers** — a meaningful share of traffic blocks the vendor endpoint. Your
   number is a sample, always. Compare trend, not absolute, unless you proxy
   first-party.
3. **Double fires** — `useEffect` in development, Strict Mode, remounts, a
   re-registered listener.
4. **Missing fires** — a path that returns early, an error thrown before the track
   call, a navigation that unmounts first.
5. **Identity** — anonymous id reset on every load means every visit is a new user.
6. **The definition** — does the dashboard's filter match what the event actually
   means? This is the answer more often than any code bug.
7. **Sampling and timezone** — the tool's day boundary is not necessarily yours.

Reproduce with the vendor's debug mode on and watch the network tab. An event you
cannot see leave the browser is not a dashboard problem.

## Hygiene

- Every event has an owner and a question in `project-conventions`.
- An event nobody has queried in two quarters gets deleted. The schema is not an
  archive.
- Changing an event's meaning is a breaking change. New name, both running, migrate,
  remove.
- Keep a list of what each vendor receives. It is the same list `security-checker`
  asks for.

## Definition of done

- [ ] Each new event has a question, an owner, and a decision it informs
- [ ] Added to the typed schema; no string literals at call sites
- [ ] `snake_case`, `object_verb_past`, never a rename of a live event
- [ ] No personal data in any property — lengths, buckets, enums, ids
- [ ] Fired from the level that knows the meaning, not from an atom
- [ ] The funnel has an abandon event
- [ ] SDK behind a vendor seam; consent gates the load
- [ ] Verified in the vendor's debug mode, not assumed
