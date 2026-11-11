# 0012. Error tracking behind one seam, scrubbed from an allowlist

- Status: Accepted
- Date: 2026-11-11
- Deciders: owner (the error-tracking trial PRD, 2026-11-11); frontend; backend (edufurtherbe-85)
- Supersedes: —

## Context and problem statement

The app had no error tracker: a crash in someone's browser reached us only if
they reported it, and `request_failed` counts failed API calls without a stack.
The backend already used Sentry. The owner approved a trial of Sentry and
PostHog error tracking side by side on both sides, scored on live traffic only
(from cutover), then one tool is kept.

An error report is a new path out of the browser to a third party. PRD 30's
rules apply to it as to analytics: no email, name, phone, message text, invite
code, query string, header, cookie or body; a member id only after Accept;
nothing during "Preview as user"; nothing stored on the device. Sentry 11
collects all of those by default (`dataCollection` replaced `sendDefaultPii`).

## Considered options

1. **One vendor seam, off by default, events rebuilt from an allowlist.**
2. **The SDK's recommended setup** (`withSentryConfig` always, init files
   importing `@sentry/nextjs` directly): standard, but Sentry ends up in the
   first page's JavaScript, its defaults collect what PRD 30 forbids, and
   removing it after the trial touches many files.
3. **A denylist scrubber** (`beforeSend` deleting known fields): smaller, but a
   field an SDK update adds leaves unseen. Both local reviews found such fields
   (`contexts.nextjs.request_path`, server transaction names).

## Decision

Option 1.

- **One seam:** `lib/vendor/errors.ts` (vendorSeams). Only `next.config.ts`
  (source-map upload) and `app/api/monitoring` (the tunnel) also name Sentry.
  The trial's loser is removed from those places.
- **Off by default:** `NEXT_PUBLIC_SENTRY_ENABLED` and a DSN, checked inline at
  each entry point so the build folds the branch. With it off the browser
  requests no Sentry code (checked: 0 of 40 requests on `/explore`), though two
  unused lazy-load stubs are still emitted.
- **Not in the first page:** loaded by dynamic import of a narrow module
  (`sentryApi.ts`) when the page is idle; early errors are held and sent once.
- **Collection off at source:** every `dataCollection` category, breadcrumbs,
  sessions, tracing (no `tracesSampleRate`, `tracePropagationTargets: []`),
  replay, console, outgoing-request and locale integrations.
- **Allowlist scrubber:** `scrubErrorEvent` builds the event from known-safe
  fields. `scrubText` masks emails and phones (`maskContactDetails`), ids,
  tokens and quoted spans, and reduces addresses to route templates.
- **Consent:** the member id only in identified mode (`setErrorUser` from
  AnalyticsRoot); the preview check is passed in at start, before React mounts.
- **Tunnel:** Sentry's own handler at `/api/monitoring`, allowing our DSN only
  (no open relay or SSRF), forwarding no cookies, outside the proxy matcher.
- **Pinned:** `@sentry/nextjs` 11.9.0 exactly. Its defaults move between
  versions, so an upgrade is re-reviewed for what it collects.

### PostHog's exceptions (PR b2)

- Behind `NEXT_PUBLIC_POSTHOG_ERRORS_ENABLED`, on top of analytics: unhandled
  errors and rejections, never the console. The exception module is posthog-js's
  own bundled chunk (`posthog-js/dist/exception-autocapture`), so PostHog still
  loads no external script.
- `$exception` events go through the same `before_send` as every event, plus
  `scrubException`: the message and values through `scrubText` (now shared in
  `lib/analytics/scrub`, one implementation for both trackers), page-URL frames
  to their template.
- An error an error page catches (React handles it, so autocapture never sees
  it) is forwarded by the error seam to every added reporter (`addErrorReporter`),
  so both tools see the same set. Identity follows analytics consent (cookieless
  until Accept); a preview sends nothing.
- Previews: a preview started on a page where PostHog already runs halts it
  (`setHalted`: `before_send` drops every event, its own autocapture included).
- Read the trial's counts knowing where PostHog sees less: unhandled errors from
  before it loads (Sentry holds up to 10), and a crash in the root layout
  (global-error replaces the providers, so no PostHog reporter is there).
  Errors an error page catches before PostHog loads are held (up to 10) and
  handed to it when it does.

## Consequences

- Good: the trial runs without changing what users download while it's off,
  and ending it is a small, contained change.
- Good: a new SDK field can't leak, because only listed fields are sent.
- Bad: less context per error than Sentry's defaults (no breadcrumbs, no
  request detail). Accepted for privacy; the PostHog replay gives context.
- Known limit: a server render during a preview can still report, with no user
  id and templated paths. The server can't see the preview (sessionStorage).
- Known risk: `/api/monitoring` is unauthenticated. Junk posts with our public
  DSN cost invocations and Sentry quota. The Vercel Firewall rate rule should
  cover it (owner to confirm).
