# Everything is dev. Nothing here is production-facing (user, 2026-10-03)

Moved from `SKILL.md` on 2026-10-12; the rule there is unchanged.

**No data this project touches today is production data, and no environment it
talks to is production.** Recorded because the app now signs real people in with
real Google accounts and renders real-looking mentors, bookings and credits —
which is exactly when someone starts treating it as live.

| What | Is | Not |
|---|---|---|
| Supabase | the **dev** project `hitgxzhrimuhivlfamhj` | not a production auth store — accounts created here, Google or email, are test accounts |
| Backend | `edufurtherbe-dev` on Railway (`edufurtherbe-dev.up.railway.app`) | never the production API |
| The mentors, bookings, reviews and credits on screen | seeded dev data on that backend, or the in-app mock (`ENABLE_MOCK_API=1`) | not real people and not real sessions |
| Supabase **Site URL** | `http://localhost:3000` | a tell that this project has never been pointed at production |

So: a test account may be deleted without ceremony, a destructive experiment
costs nothing, and **no screenshot, export or log from here is customer data**.

The flip side, and the reason this is written down rather than assumed: *nothing
here has been proven against production.* Before a production cutover, every row
above has to be revisited deliberately — a second Supabase project with its own
redirect allow-list and Site URL, the Google OAuth client's authorised redirect
URIs pointing at it, `BACKEND_URL` on the production API, and `NEXT_PUBLIC_*`
set per Vercel environment. Treat a green CI run as evidence about the code, not
about the environment.
