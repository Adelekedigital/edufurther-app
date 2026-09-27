---
name: release-notes
description: Generate release notes, changelogs, and version bumps from Conventional Commits using SemVer and Keep a Changelog — including what counts as breaking in a frontend, and how to describe a change users can see. Use when cutting a release, tagging a version, writing or updating CHANGELOG.md, preparing notes for a PR or deploy, deciding whether a change is major/minor/patch, or when asked what changed between two versions.
---

# Release notes

The changelog is read by people deciding whether to upgrade, and by whoever is
debugging at 2am. Write for both.

## Conventional Commits

```
<type>(<scope>)!: <summary>

[body]

BREAKING CHANGE: <what breaks and what to do>
```

| Type | Bump | In the changelog |
|---|---|---|
| `feat` | minor | yes |
| `fix` | patch | yes |
| `perf` | patch | yes |
| `refactor` | patch | only if visible |
| `a11y` | patch | yes — users notice |
| `docs`, `test`, `chore`, `ci`, `style`, `build` | none | no |
| `!` or `BREAKING CHANGE:` | major | yes, first |

Scopes for a frontend: the atomic level or the area —
`feat(molecules): …`, `fix(profiles): …`, `perf(bundle): …`.

```
feat(profiles)!: replace `profiles` prop with `items` on ProfileList

BREAKING CHANGE: ProfileList now takes `items`. Rename the prop at all call
sites; the shape is unchanged.
```

## What is breaking in a frontend

Less obvious than in a library, and routinely under-called:

| Breaking | Why |
|---|---|
| Removing or renaming a public component prop | every consumer's build |
| Changing a route or a URL shape | bookmarks, external links, deep links |
| Renaming or removing a design token | every consumer of that token |
| Changing a persisted key's shape (`localStorage`, IndexedDB) | returning users read the old shape |
| Renaming an analytics event | every dashboard silently truncates |
| Removing a feature flag that consumers set | their config stops working |
| Raising a minimum browser version | someone's users |
| Changing a public component's rendered element or role | consumers' CSS and tests |

A persisted-key change needs a migration or a namespaced key, not just a note — a
returning user with the old shape must not crash.

## Keep a Changelog

```md
# Changelog

All notable changes to this project are documented here.
Format: Keep a Changelog. Versioning: SemVer.

## [Unreleased]

## [2.4.0] — 2026-08-14

### Added
- Profile setup now shows how many steps remain (#412)
- Offline support for the bookings list; queued changes sync on reconnect (#418)

### Changed
- **Breaking** `ProfileList` takes `items` instead of `profiles` (#420)
- Session-type cards reflow to one column below 480px (#415)

### Fixed
- Error state no longer renders as "nothing here yet" when a request fails (#409)
- Focus returns to the trigger when the booking modal closes (#411)

### Performance
- Editor is now lazily loaded; initial JS down 84kB to 236kB (#414)

### Accessibility
- Month picker is operable by arrow keys; adds visible focus rings (#413)

[unreleased]: https://github.com/org/repo/compare/v2.4.0...HEAD
[2.4.0]: https://github.com/org/repo/compare/v2.3.1...v2.4.0
```

Sections in this order, omitting empty ones: **Added, Changed, Deprecated, Removed,
Fixed, Performance, Accessibility, Security.**

`Performance` and `Accessibility` are worth splitting out in a frontend changelog:
they are the changes users feel and that nobody reads a `fix` line for.

## Write the user-visible effect

| Commit | Changelog line |
|---|---|
| `fix(list): correct state branch order` | Error state no longer renders as "nothing here yet" when a request fails |
| `perf(editor): dynamic import` | Editor is lazily loaded; initial JS down 84kB to 236kB |
| `feat(a11y): roving tabindex on MonthPicker` | Month picker is operable by arrow keys |
| `refactor(hooks): extract useProfiles` | *(omit — nothing visible)* |

Include the number when there is one. "Improved performance" is unfalsifiable;
"84kB smaller" is a fact someone can check.

## SemVer for an application

For a deployed app rather than a published package, the useful reading is:

- **major** — a user or an integrator must do something: a changed URL, a migration,
  a removed feature
- **minor** — new capability, nothing required of anyone
- **patch** — fixes and improvements only

Pre-1.0 is not an excuse to skip the breaking marker. The marker is how a reviewer
knows to look for a migration.

## Cutting a release

1. `git log v<previous>..HEAD --oneline` — read every line.
2. Any commit that is breaking but unmarked? Fix the classification **before**
   computing the bump. A missed `!` is a wrong version number.
3. Compute the bump: any breaking → major; any `feat` → minor; else patch.
4. Move `[Unreleased]` into a dated version; add the compare links.
5. Verify: `check-boundaries.mjs` clean, tests pass, `review-page.mjs` clean on the
   main routes, budgets met. A release that ships a budget regression should say so
   explicitly.
6. Tag `v<version>`, matching `package.json`.
7. Note any migration a returning user needs — a persisted-key change especially.

## Between two versions

```bash
git log v2.3.0..v2.4.0 --pretty='%h %s' --no-merges
git diff v2.3.0..v2.4.0 --stat -- src/components src/app
```

Group by scope, keep the user-visible ones, drop the chores. If a range contains
commits that do not parse as Conventional Commits, say which — they may be hiding a
breaking change.
