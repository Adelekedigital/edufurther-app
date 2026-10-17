# 0008. AI writing help happens in place, and nothing it writes saves by itself

- Status: Accepted
- Date: 2026-10-17
- Deciders: product (owner, PRD Mentee Onboarding v5 F6/B7); design (`AiField.dc.html`)
- Supersedes: —

## Context and problem statement

Long profile texts (the mentor About now; the mentee bio and Why I mentor later) get AI help: "Write a draft" on an empty box, "Improve" on the person's own words. This is a new interaction for the product, and BFM has no precedent for an in-field AI writing assistant (queried 2026-10-17; the nearest, Monzo's "Write a note to yourself", only covers the length guidance). The failure to avoid is AI text going public as if the person wrote it, unseen.

## Decision drivers

- People must stay the author: AI text is a proposal until they save it.
- Readers of a profile, and the platform, need to know whether the text is still an untouched draft (PRD B7 provenance).
- One component for every long text, so the rule lives in one place.
- Failures (the daily limit, the AI being down) must never cost the person their words.

## Considered options

1. An in-place field (`AiField`): the action sits in the box's bottom bar, the result replaces the text, **Undo** restores what was there, an untouched draft wears "Drafted for you", and only the field's own Save stores it — with `drafted` and the prompt version.
2. A suggestion panel beside the box that the person copies from.
3. Generate on save, silently.

## Decision

Option 1, as `AiField.dc.html` draws it. The molecule is props-only (`onAssist(mode, text) => Promise<string>`); the page supplies the call (`POST /me/writing-assist`, which never saves). "Drafted" means the text equals the last AI result, ignoring whitespace; editing any word clears it and brings "Improve" back. While a call runs the box is read-only. A failure shows in a polite status line and leaves the text exactly as it was. Saving sends `about_me_drafted` and the prompt version (true stamps both, false clears both).

Option 2 doubles the surface and makes the person do the paste. Option 3 removes the person from authorship, which is the failure this ADR exists to prevent (the silent onboarding bio, PRD B6, is a separate, labelled draft the person sees and edits later).

## Consequences

Good:
- One interaction for every long text; the mentee bio and Why I mentor mount the same molecule with a different field and limit.
- Provenance is exact and cheap: the server knows whether a saved About is still the AI's words.
- Nothing is lost on failure, and every AI change can be undone before saving.

Bad:
- Undo covers only the last AI change, not a full history.
- Typing a draft back to its exact words counts as "drafted" again — by design (the words are the draft's), but worth knowing.
- Novel, so unmeasured: client analytics are out of scope (PRD F5). The database records drafted saves (`about_me_drafted_at`), which is the signal to check first if people don't use it.
