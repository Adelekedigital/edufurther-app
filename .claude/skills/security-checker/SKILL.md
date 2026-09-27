---
name: security-checker
description: Frontend security review — XSS and dangerouslySetInnerHTML, what may be stored where in the browser, public config versus secrets that leak into the bundle, open redirects and untrusted URLs, third-party scripts and supply chain, CSP, clickjacking, and what is safe in a log or a session replay, plus PII and retention. Use when rendering raw HTML, storing anything client-side, adding an environment variable or dependency, handling a URL or redirect from user input, embedding a third-party script, adding logging or analytics, or when anything personal is on screen.
---

# Security — frontend

The browser is a hostile environment you do not control. Everything here assumes
the server validates independently; client-side checks are UX, not security.

## XSS

### The rule

Never pass unsanitised input to `dangerouslySetInnerHTML`. React escapes by
default; that prop is the one place you have opted out.

```tsx
// no
<div dangerouslySetInnerHTML={{ __html: post.body }} />

// yes — sanitise, with an allowlist, at the boundary
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(post.body, {
    ALLOWED_TAGS: ['p', 'a', 'strong', 'em', 'ul', 'ol', 'li', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'title'],
  }),
}} />
```

Better still: render markdown to a React tree rather than to an HTML string. No
string, no injection point.

### The other injection points

| Sink | Risk |
|---|---|
| `href={userValue}` | `javascript:` and `data:` URLs execute |
| `src` on `<iframe>`, `<script>`, `<img>` | arbitrary remote load |
| `style={{ background: userValue }}` | `url()` exfiltration |
| `<svg>` from user upload | SVG carries `<script>` |
| `eval`, `new Function`, `setTimeout("string")` | never, with any input |
| Template literals building HTML | same as `innerHTML` |
| `ref.current.innerHTML = …` | bypasses React entirely |

```ts
const SAFE = new Set(['http:', 'https:', 'mailto:']);
export function safeHref(raw: string, base = window.location.origin) {
  try {
    const url = new URL(raw, base);
    return SAFE.has(url.protocol) ? url.toString() : '#';
  } catch { return '#'; }
}
```

Any `target="_blank"` also carries `rel="noopener noreferrer"`.

## Storage — the table

| Store | Survives | Readable by JS | Put here |
|---|---|---|---|
| Memory | tab lifetime | yes | access tokens, anything sensitive |
| `httpOnly` cookie | per expiry | **no** | session/refresh tokens |
| `sessionStorage` | tab | yes | wizard progress, scroll position, non-sensitive draft |
| `localStorage` | forever | yes | theme, last filter, dismissed banner, feature-tour state |
| IndexedDB | forever | yes | offline cache of non-sensitive data |
| URL / query string | shared, logged | yes | shareable state only |

### Nothing sensitive in `localStorage`

Any XSS reads all of it, it never expires, and it is readable by every script on
the origin — including the ones you did not write.

Never in `localStorage` or `sessionStorage`:

- access or refresh tokens, API keys, session ids
- personal data — email, phone, address, DOB, government id
- anything about health, finances, or payment
- an authorization decision the UI then trusts (`isAdmin: true`)

Tokens live in memory, with refresh in an `httpOnly; Secure; SameSite` cookie.
"But then a refresh logs the user out" is solved by a silent refresh call, not by
`localStorage`.

**Clear it on logout.** A shared machine is the normal case, not the edge case.
Enumerate your keys and remove them; do not rely on `clear()` alone in an app with
other subsystems.

### The URL is not private

Query strings land in browser history, server logs, `Referer` headers, and
analytics. Never put a token, an email, or an id you would not paste into a
support ticket in one.

## Public config vs secrets

Anything prefixed for the client is **in the bundle**, readable by anyone.
`NEXT_PUBLIC_*`, `VITE_*`, `REACT_APP_*` — all public, permanently, including in
old deploys.

| Safe to expose | Never |
|---|---|
| API base URL | any API secret or private key |
| Publishable/public keys (payments, maps, analytics) | service-role or admin keys |
| Feature flag defaults | signing secrets, webhook secrets |
| Build metadata, sentry DSN | database URLs or credentials |

Checks worth having:

- Grep the built bundle for your secret patterns in CI. One `grep` catches what a
  review will not.
- A secret scanner in pre-commit.
- No `.env*` committed; `.env.example` with empty values only.
- **Rotate anything that ever reached a bundle.** Removing the variable does not
  un-publish the old build.
- Server-only modules are imported only from server components or route handlers.
  A single accidental client import pulls the secret across.

## Open redirects and untrusted URLs

```ts
const ALLOWED_HOSTS = new Set([window.location.host]);

export function safeRedirect(next: string | null, fallback = '/') {
  if (!next) return fallback;
  try {
    const url = new URL(next, window.location.origin);
    if (!ALLOWED_HOSTS.has(url.host)) return fallback;
    if (!['http:', 'https:'].includes(url.protocol)) return fallback;
    return url.pathname + url.search + url.hash;   // drop the origin entirely
  } catch { return fallback; }
}
```

Allowlist the host. Never `startsWith('/')` — `//evil.com` passes that check and is
a protocol-relative URL to another origin.

Also: never render an id from the URL as authorization. `?userId=` in the URL is a
request, not a claim; the server decides.

## Third-party scripts and supply chain

Every third-party script runs with your origin's full privileges. It can read the
DOM, the cookies JS can see, and everything in `localStorage`.

- Load through `lib/vendor/` and declare the seam, so it is replaceable.
- Prefer `async`/`defer`; never in `<head>` blocking render.
- Subresource Integrity on any pinned CDN asset.
- Nothing in a payment or authentication flow unless it is the payment provider.
- Keep a list of what runs, and why. An analytics tag added "temporarily" two years
  ago is still exfiltrating form fields.

Dependencies:

- Lockfile committed; `--frozen-lockfile` in CI.
- `pnpm audit` in CI, with a policy for what blocks a release.
- Review the diff on a **postinstall** script. That is where supply-chain attacks
  land.
- Pin exact versions for anything that touches auth, payments, or crypto.

## CSP

```
default-src 'self';
script-src 'self' 'nonce-<per-request>';
style-src 'self' 'nonce-<per-request>';
img-src 'self' data: https://<your-cdn>;
connect-src 'self' https://api.example.com;
frame-ancestors 'none';
object-src 'none';
base-uri 'self';
form-action 'self';
```

- Nonce-based beats allowlists. `'unsafe-inline'` on `script-src` gives up most of
  the benefit.
- `'unsafe-eval'` usually means a dev-only tool leaked into the production build.
- Ship `Content-Security-Policy-Report-Only` first, watch the reports, then
  enforce.
- `frame-ancestors 'none'` is the modern clickjacking defence; keep
  `X-Frame-Options: DENY` for old browsers.

Also set: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, and a `Permissions-Policy`
that turns off what you do not use.

## Authorization is not a frontend concern

Hiding a button is UX. The server enforces.

- Never decide access from a claim the client stores.
- Never assume an unrendered route is unreachable — the bundle contains it.
- A 403 must render as a 403, not as an empty list. An empty list for a permission
  failure is indistinguishable from data loss.

## Logs, errors, and session replay

The replay tool and the error tracker both ship your users' screens off-site.

| Always masked | |
|---|---|
| Password, OTP, recovery code | every payment field |
| Government id, DOB | address, phone, email |
| Free-text fields that may contain anything | auth tokens in headers or URLs |

- Mask by **default**, allowlist what is visible. An opt-out list is one new field
  away from a leak.
- Scrub error reports: strip request bodies, `Authorization` headers, and query
  strings before send.
- Never log a token, even truncated. Never log a full request body.
- Log a **correlation id** and look the rest up server-side.
- Breadcrumbs record *that* a field changed, never its value.

## PII and retention

Know what personal data the frontend touches, where it rests, and for how long.

| Question | Answer must exist |
|---|---|
| What personal data does this screen display or collect? | field list |
| Where does it rest client-side? | memory / session / local / IndexedDB / nowhere |
| How long does it live there? | tab / session / explicit TTL |
| What clears it? | logout, a TTL sweep, a user action |
| Who else receives it? | analytics, replay, error tracker, support tool |
| Is there a minimisation to make? | id instead of email; initials instead of name |

Practical rules:

- **Minimise at the seam.** If the list only shows initials, do not fetch the full
  name into the client.
- Anything cached offline for a logged-in user is purged on logout — including
  IndexedDB and any service-worker cache. See `pwa-offline`.
- Give every client-side cache of personal data an explicit TTL. "Until the user
  clears their browser" is not a retention policy.
- Analytics carries an anonymous id, never an email or a raw user id. See
  `analytics`.
- A deletion request must reach client caches too. Document which ones exist.
- Consent gates loading the script, not just sending the event. A blocked tag that
  still loaded already has the DOM.

## Review checklist

- [ ] No `dangerouslySetInnerHTML` without allowlist sanitisation at the boundary
- [ ] Every user-controlled `href`/`src` passed through a protocol allowlist
- [ ] `target="_blank"` carries `rel="noopener noreferrer"`
- [ ] Nothing sensitive in `localStorage`/`sessionStorage`; tokens in memory + cookie
- [ ] Storage enumerated and cleared on logout
- [ ] No secret behind a public env prefix; bundle grepped in CI
- [ ] Redirects allowlist the host; no `startsWith('/')` check
- [ ] New dependency reviewed, lockfile frozen, postinstall inspected
- [ ] Third-party scripts behind a vendor seam, with a reason each
- [ ] CSP present, nonce-based, no `unsafe-inline` on scripts
- [ ] Replay and error reports mask by default
- [ ] PII table answered for this screen; a minimisation considered
- [ ] Offline caches purged on logout
