---
description: Create the next numbered Architecture Decision Record from the MADR template.
argument-hint: "<short title>"
allowed-tools: Glob, Grep, Read, Write, Bash
---

# /adr-new

Title: `$ARGUMENTS`

## 1. Check it is a decision

Load `adr` and apply its test: **would a competent person six months from now
wonder why, and be tempted to change it back?**

If not, it is an implementation. Say so and offer the alternatives instead:

- a row in `project-conventions` → house convention
- a row in `references/design-divergence.md` → a value difference from the design
- a line in the commit message → a one-off choice

Writing an ADR for a non-decision dilutes the directory until nobody reads it.

## 2. Check it is not already decided

```bash
ls docs/adr/
grep -ril "<keyword>" docs/adr/
```

If a prior ADR covers this, you are either **superseding** it — in which case read
it and say what changed — or re-litigating it, in which case stop. Re-opening a
decision whose constraints are already written down is the most common waste in a
codebase.

## 3. Number it

Next unused four-digit number, zero-padded. Never reuse one, even if an ADR was
rejected.

```
docs/adr/0008-<kebab-title>.md
```

## 4. Write it

```md
# 0008. <Title>

- Status: proposed
- Date: <today>
- Deciders: <who>
- Supersedes: <NNNN, or —>

## Context and problem statement

<The problem, not the solution. Two or three sentences. Include the number that
makes it a problem — the budget, the count, the duration.>

## Decision drivers

- <constraint>
- <constraint>

## Considered options

1. <option>
2. <option>
3. <option — "do nothing" is often a real one>

## Decision

<Which, and in one sentence why.>

## Consequences

Good:
- <consequence>

Bad:
- <consequence — this list must not be empty>

Accepted because:
- <why the bad consequences are worth it, and what would change that>
```

## 5. Rules

- **The bad consequences list must not be empty.** An ADR with only benefits is a
  justification, not a record — and the thing you will want to know later is what
  you accepted.
- Context states the problem, never the solution. "We need Zustand" is not a
  context.
- One page. Anything longer belongs in a skill or in `project-conventions`.
- Status `proposed` until someone agrees. Do not write `accepted` on your own
  proposal.
- Add the decision to `project-conventions`' settled-decisions table with a link,
  so the index and the record stay connected.

## 6. Report

Print the path and the decision sentence. Say it is `proposed` and who needs to
agree.
