# Experiment: a "Scouting your mentors…" screen before the matches

Status: **possible A/B test, not built.** Owner, 2026-11-18.

## The idea

Between the last onboarding step (study plans) and the matches, hold a short
screen for about 1.5 s, even when the matches come back sooner:

- a title, "Scouting your mentors…", and a subline;
- a short checklist that ticks off one item at a time;
- one EduFurther benefit card;
- then the matches slide in as they do today (heading, then each card).

Board: `Scouting.dc.html` in the onboarding v2 design project (drawn at about
3 s; the test would use about 1.5 s).

## What we'd measure

**Metric:** the share of mentees who book a session from the matches screen,
with the scouting screen against without it (today's screen). Count a booking
request sent from the matches (`booking_requested` with entry point
`onboarding_guest`, which every booking from onboarding carries) within the
same visit.

Guardrails: Skip for now rate (`onboarding_matches_skipped`), and leaving the
page during the hold.

## Why it isn't the default

- **It is an artificial wait.** The matches usually load fast, and a tester
  already called the onboarding steps blocking. Holding people on purpose adds
  friction on the screen we most want them to act on.
- **People don't read during spinners.** A checklist and a benefit card shown
  while something "loads" are mostly skipped over, so the content may not earn
  the wait.
- The argument for it (a sense that real work went into the matches, the
  "labor illusion") is plausible but unproven for us. That is what a test is
  for, not a default.

## Notes for when the test is designed (owner, 2026-11-18)

- **Subline:** say it is finding mentors "closest to your interests and
  profile".
- **The checklist must carry real signals from the mentee's own answers.** The
  drafted steps ("Where you want to study", "The help you picked", "Mentors
  with open times") "don't communicate anything". The test version shows what
  this mentee actually told us, for example their study country by name, their
  help areas by name, and the count of mentors checked.
- **The benefit cards need stronger, platform-specific content**: what
  EduFurther gives a mentee that a generic tip wouldn't (for example, mentors
  who've done the exact path, the free first session), not generic copy.
- Respect reduced motion: no spin or pulse; the checks may still tick.
