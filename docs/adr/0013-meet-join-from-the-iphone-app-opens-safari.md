# 0013. Join from the installed iPhone app hands Google Meet to Safari

- Status: Accepted
- Date: 2026-11-18
- Deciders: product (owner, on iPhone)
- Amends: 0009 (Join is an ordinary link to our own entry route)

## Context and problem statement

ADR 0009 makes Join a new-tab link (`target="_blank"`) to `/sessions/{id}/enter`, which
records the arrival and 303s to the call. In the installed app on iPhone (a home-screen
web app, standalone), a new-tab link opens an in-app Safari sheet. That sheet has its own
cookie jar, so it isn't signed into the person's Google account, and it doesn't hand off
to the Meet app. Google Meet then asks the person to sign in or knock as a guest. Android
(a Custom Tab shares Chrome's sign-in) and desktop are fine. Daily calls run in the page
and need no Google account.

## Decision drivers

- A Meet call from the iPhone app should open where the person is signed in.
- Nothing about Join changes anywhere else: Daily, Zoom, custom links, Safari tabs,
  Android, desktop.
- ADR 0009 holds: the route records the arrival, the server's clock decides, the call link
  never sits in the page, and nothing user-controlled becomes a redirect.

## Decision

Only in the installed app on iOS 17 or later (`canHandOffToSafari()`, `lib/utils/standalone`:
`navigator.standalone` or `display-mode: standalone`, and an iPhone/iPad/iPod user agent
reporting iOS 17+) and only for a `google_meet` session:

1. Join links to `/sessions/{id}/enter?open=safari` (`enterPath(id, { inSafari: true })`)
   and opens in the **same window**: no `target`, no `rel`, no "(opens in a new tab)" in
   its name. The hint says "Opens Google Meet in Safari, where you're signed in."
2. The route does everything as before. Only when it would 303 to the call, and the ask is
   present, it passes the **server's own** link through `safariHandoff()`
   (`lib/utils/sessionEnter`): parsed with `URL`, `https:`, hostname exactly
   `meet.google.com`, no credentials, no port. That link is sent as
   `x-safari-https://meet.google.com/…`. Anything else (another host, a look-alike, a
   subdomain, no ask) is the usual redirect; an unsafe link is still `?enter=nolink`.
   `Cache-Control: no-store` and `Referrer-Policy: no-referrer` are unchanged.

The query parameter only switches the hand-off on. The destination is always the
backend's own Meet link, so it is no open redirect. `isStandalone()` moved from
`lib/analytics/install` to `lib/utils/standalone`, which the install count now imports.

### Why a redirect, and why the page isn't left blank

The app navigates its own window to `/enter`. The route's 303 to a scheme that isn't
http(s) is not loaded as a document: the HTML navigation algorithm hands a non-fetch
scheme "off to external software" and the navigation ends, so the window stays on the
session page it came from (the same thing that happens with a redirect to `tel:` or an
app's own scheme). The service worker answers navigations with `fetch()`, which returns
the redirect unfollowed, so it changes nothing here. The other outcomes (`?enter=…`, sign
in) now load in the same window instead of a second tab, which is better in the app: no
stray sheet. The alternative, sending the page `?open=…` and setting
`window.location.href = 'x-safari-https://…'` from script, would put the call link in the
page, which ADR 0009 rules out. We'll fall back to it only if the iPhone check shows the
redirect fails.

### iOS older than 17

`x-safari-https` is reported to work on iOS 15, 17 and 18 but not on iOS 16. A failed
hand-off could leave the person with an error and no call. So below iOS 17, and on an iPad
asking for the desktop site (it reports a Mac, with no iOS version), nothing changes: the
new-tab sheet as before. That is today's behaviour, so the fallback can't make anything worse.

## Consequences

Good:

- From the iPhone app, Meet opens in Safari, signed in, or in the Meet app.
- Everything else, Daily included, is byte for byte what ADR 0009 describes.

Bad, accepted:

- `x-safari-https` is undocumented by Apple. It is known from developers' testing, not a
  spec, and could change in an iOS release. If it stops working the hand-off fails in
  place (the person stays on the session page, the arrival already recorded), and the
  version gate is the place to turn it off.
- No source found tests it from a standalone web app specifically. **It needs an iPhone
  check on staging before production**: installed app → Join a Meet session → Safari or
  the Meet app opens, signed in, and the app stays on the session page.
- iOS may ask "Open in Safari?" first. That is the system's prompt, not ours.
- Version detection reads the user agent. Safari's frozen user agent still reports an iOS
  major of 17 or more on current releases, which is all the gate needs.

## Evidence

- `src/app/sessions/[id]/enter/route.ts`, `src/lib/utils/sessionEnter.ts`
  (`enterPath`, `safariHandoff`), `src/lib/utils/standalone.ts`
- `src/app/sessions/[id]/_components/SessionJoinScreen.tsx`, `lobbyModel.ts`;
  `src/components/organisms/SessionLobby/SessionLobby.tsx` (`sameWindow`)
- `src/lib/pwa/worker.js` (navigations: `fetch()`, redirects unfollowed)
- Christian Tietze, "Safari URL Scheme for macOS and iOS" (2023, updated): `x-safari-https:`
  works on iOS 15, 17 and 18, not 16 —
  https://christiantietze.de/posts/2023/05/safari-for-mac-url-scheme
- HTML Standard, navigation: a response whose location URL has a non-fetch scheme is
  handed off to external software, and the navigation stops —
  https://html.spec.whatwg.org/multipage/browsing-the-web.html#hand-off-to-external-software
- Maximiliano Firtman, "iOS 12.2 for PWAs", https://firt.dev/ios-12.2/ : since iOS 12.2 a
  standalone web app opens out-of-scope links in an in-app browser that shares no storage
  with Safari (why the sheet is signed out), and a web app could then hand a link only to
  Chrome or Firefox through their URI schemes. That predates `x-safari-https` on iOS, and
  shows the app hands app schemes to the system.
