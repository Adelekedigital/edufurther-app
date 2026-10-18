# 0009. Join is an ordinary link to our own entry route

- Status: Accepted
- Date: 2026-10-17
- Deciders: product (owner, issue #207)
- Supersedes: —

## Context and problem statement

The session page's Join asked the server for the call link and recorded the arrival in one
request (`POST /sessions/{id}/join`), then sent a new tab to the link. The link only
existed after the request, so the page opened a blank tab from code during the click and
redirected it later. Browsers treat that as a possible popup (Safari refuses it), the
person sees a blank "Opening your session…" tab while waiting, and middle-click,
long-press or "open in new tab" can't work, because there is no real link.

A first attempt fetched the link early through `POST /sessions/{id}/door` (which records
nothing) and drew Join as a link to it, sending `/join` from the click handler. Review
found the blocker: opening that link any way other than a plain click (long-press,
right-click "open in new tab", drag, middle-click on some browsers) never runs our click
handler, so the arrival, which is the attendance record, was never sent. The page's own
clock also decided whether the link was offered, so a skewed device clock could let a late
first-timer straight into the call. And the caller's tokened link sat in the page from the
moment the window opened.

## Decision drivers

- Join should behave like any link: no blank tab, no popup blocker, every way of opening it works.
- Every way of opening it must record the arrival.
- The server's clock, not the device's, decides who may enter.
- The call link (which can carry the caller's token) should not sit in the page.

## Decision

Join and Rejoin are a plain new-tab link (`<a target="_blank" rel="noopener noreferrer">`,
not next/link) to **our** route, `GET /sessions/{id}/enter`
(`src/app/sessions/[id]/enter/route.ts`). The route:

1. Refuses a navigation another site started: `Sec-Fetch-Site` must be `same-origin` or
   `none` (missing is allowed for older browsers). Anything else goes to the session page
   with nothing recorded. So does a request that says it is a prefetch or prerender
   (`Sec-Purpose` or `Purpose` containing `prefetch`).
2. Takes the access token the proxy verified (`x-ef-access-token`, forwarded for this
   exact path and `/` only; a client's own copy is removed on every path, ADR 0004).
   Signed out goes to `/login?next=/sessions/{id}`.
3. Sends `POST /join` as the person; on a `409`, `POST /door`. Both share one 8-second
   deadline; running out of it is `?enter=failed`. A safe link
   (`safeMeetingUrl`) is a `303` to the call. Otherwise it is a `303` back to
   `/sessions/{id}?enter=nolink|closed|notopen|failed`, which the page says in its usual
   words and then removes from the URL. `404`/`403`/`422` go to the page, which shows its
   own not-found; `401` goes to sign in.
4. Answers with `Cache-Control: no-store` and `Referrer-Policy: no-referrer` (the call's
   site learns nothing of our pages), and never logs the link or the token.

In local dev and CI (`NEXT_PUBLIC_MOCK_VIEWER` set, as `home.ts` decides) it calls the
in-app mock on its own origin (ADR 0006); the mock's j-8 and j-9 refuse entry, so
`?enter=closed` and `?enter=notopen` can be seen there. The page re-reads the session whenever its tab
comes back into view (`refetchOnWindowFocus: 'always'`), so "Joined" and Rejoin show on
return.

## Consequences

Good:
- Every way of opening Join records the arrival: click, middle-click, new tab, drag, a
  bookmark of the route.
- The server's clock decides the window; a device clock can't let anyone in late.
- The call link is never in the page or its DOM; it exists only as a redirect target.
- No popup, no blank tab, no blocked-window notice.

Bad, accepted:
- A GET with a side effect. Mitigated by the `Sec-Fetch-Site` check, the refusal of
  requests that announce themselves as prefetches, and never using next/link (the router
  never prefetches it).
- iOS Safari's long-press preview may load the link, which records an arrival and can
  show the call in the preview.
- Each press mints a fresh link, so pressing twice opens two tabs.
- A failure doesn't come back to the page the person pressed Join on: the new tab shows
  the session page with the reason, beside the original, and pressing Join again there
  opens yet another tab.
- A Rejoin inside the join window sends `POST /join` again before anything else. That is
  safe: `/join` keeps the first arrival, and only a 409 sends the route to `/door`.
- Space doesn't activate a link; only Enter does.
- A second server-side path to the backend besides `/`'s `/me` (ADR 0005), configured by
  the same `BACKEND_URL`.

## Evidence

- `src/app/sessions/[id]/enter/route.ts`, `src/lib/api/data/sessionEnter.ts`,
  `src/lib/utils/sessionEnter.ts`
- `src/proxy.ts` (`isEnterPath`), `src/lib/vendor/supabase/server.ts` (`ACCESS_TOKEN_HEADER`)
- `src/app/sessions/[id]/_components/SessionJoinScreen.tsx`, `lobbyModel.ts`;
  `src/components/organisms/SessionLobby/SessionLobby.tsx`; `ButtonAnchor` in
  `src/components/atoms/Button/Button.tsx`
- `src/lib/api/data/sessionRoom.ts` (`refetchOnWindowFocus: 'always'`)
- Backend spec: `POST /sessions/{id}/join` and `/door`, `/problems/join-window-closed`
