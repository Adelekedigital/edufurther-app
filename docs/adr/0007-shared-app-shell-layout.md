# 0007. Render the app shell once in a shared route-group layout

- Status: Accepted
- Date: 2026-10-14
- Deciders: product (owner); project standards (`CLAUDE.md`)
- Supersedes: —

## Context and problem statement

Every signed-in screen — Dashboard, Bookings, Calendar, Explore, Integrations, Session types — wraps its own content in `<AppShell active="…">`, fed by the shared `useAppShell` hook. The only layout is the root `app/layout.tsx`. So navigating between these routes unmounts and remounts the whole shell (sidebar, header, account menu) — a visible blank/flash, worst on heavier or redirecting routes. The nav's "Home" points at `/`, whose `page.tsx` does `redirect(await fetchHome())` — a 307 per request — so clicking Home is a full server round-trip. The shell should stay mounted while the user moves between app routes; only the page content should change.

## Decision drivers

- The reload/flash is user-visible (reported; worst on Home and Bookings).
- `AppShell` is already viewer-aware (`chromeFor`: guest vs member; mentor vs mentee nav), and its data is shared via `useAppShell`; only the component is duplicated per page.
- The App Router makes a persistent shell idiomatic via a shared layout.
- Must preserve per-route `active`, the viewer-aware chrome (incl. guests on public routes), and screen isolation (Storybook / tests).

## Considered options

1. An `(app)` route group with a `layout.tsx` that renders `<AppShell>` once (viewer-aware); the shell-rendering routes move into it; screens render only their content.
2. Keep flat routes; render `<AppShell>` conditionally in the root layout by pathname.
3. Leave it; accept the remount/reload.

## Decision

Option 1. An `src/app/(app)/` route group whose `layout.tsx` renders `<AppShell>` once — fed by `useAppShell`, `active` derived from the pathname — and the shell-rendering routes move inside it. Each screen stops rendering `<AppShell>` and returns only its content. The nav's "Home" links straight to each viewer's home — mentor → `/dashboard`, mentee → `/explore` (both from `homeFor`) — instead of `/`, so in-app Home nav skips the 307. There is no `/home` route yet; mentees' home is Explore today, so mentee Home and Explore share an href (aria-current lands on Explore) — unchanged from before, where Home `/` already redirected mentees to Explore. `/` stays the cold-entry redirect. Focus moves to the page heading on route change. The public mentor profile (`mentors/[handle]`) and the focused session-join (`sessions/[id]`) keep their own chrome for now (follow-up).

Option 2 is rejected: the root layout also serves signed-out routes (sign-in), so branching it by pathname is fragile. Option 3 leaves a user-visible defect.

## Consequences

Good:
- The shell persists across app navigation — no remount/blank/flash — for mentee, mentor and guest alike; the sidebar stays put.
- Focus is managed on route change — an accessibility gain the per-page shell blocked.
- Screens get simpler (content only); the shell wiring lives in one place.

Bad:
- A one-time broad refactor: route folders move into the group and ~7 screens change (plus tests that mock `useAppShell` and assert `<AppShell>`); relative imports that climb to `_shell`/etc. shift by one segment.
- The layout now owns `active`-from-pathname and the `useAppShell` wiring — one new place to get right; the source of truth for `active` moves from a prop to the route.
- `/` keeps its 307 for a cold visit; only in-app Home nav avoids it. The profile + session-join stay per-shell, so navigating to/from them still remounts (follow-up).

Accepted because the reload is user-visible and a shared layout is the idiomatic App Router fix; the refactor is broad but one-time, and the residual costs are documented.

## Evidence
- `src/app/*/_components/*Screen.tsx` (`<AppShell active=…>`), `src/app/_shell/useAppShell.ts`, root `src/app/layout.tsx`, Home redirect `src/app/page.tsx`.
- `CLAUDE.md` → Layout.
