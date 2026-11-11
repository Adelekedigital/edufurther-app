# The GitHub `/code-reviewer` loop (owner, 2026-10-12)

Moved from `SKILL.md` on 2026-10-12. The rule (two reviews on every code PR) stays
in `SKILL.md`; this is how the second review runs.

**Which reviewer (owner, 2026-11-11):** **Kimi is the default** (`CODE_REVIEWER_PROVIDER=kimi`,
paid from a Moonshot top-up meant to last about 3 weeks across both repos). Claude has
no API credit until **17 Nov 2026**; after that, name it only on high-risk PRs (auth,
money or credits, migrations, security) with `/code-reviewer claude`, at
`CLAUDE_REVIEW_EFFORT=medium` and `CLAUDE_MAX_BUDGET_USD=1.5` (a repository variable
since #545; default 3). `/code-reviewer kimi` or `/code-reviewer codex` picks one with
no fallback. Codex is kept only for reactivation. A failed leg says why in the run's
warning (out of credit, model not available, budget cap, rate limited, key rejected,
exit code), matched from stderr and stdout's last line and never printed (#545, #548;
the backend's reviewer uses the same six patterns). **No merge without a completed
review**: if Kimi's credit runs out, merges wait.
Keys are secrets (`ANTHROPIC_API_KEY`, `MOONSHOT_API_KEY`, `OPENAI_API_KEY`); models
and efforts are **variables** (`CLAUDE_REVIEW_MODEL`, optional `CLAUDE_REVIEW_EFFORT`,
`KIMI_REVIEW_MODEL`, `CODEX_REVIEW_MODEL`, `CODEX_REVIEW_EFFORT`), because GitHub drops
a job output containing a secret's value and a review naming its model would arrive
empty. Claude and Kimi run through one pinned Claude Code CLI, read-only, with the
PR's own `CLAUDE.md`, `.claude/`, `.mcp.json` and symlinks deleted first, and the
prompt and `AGENTS.md` taken from the base branch, so a change cannot instruct its
own reviewer.

**When to ask for a review (owner, 2026-11-11, both repos):**
- **Only once CI is green on that head**, and once per fix round: batch the round's
  fixes into one push, then one `/code-reviewer`. Never on a pending or red head.
- **Trivial PRs get CI only**, no GitHub review: docs, tests, mocks.
- **No stacked PRs**: each PR targets `development` on its own (a moved base re-ran
  reviews).
- **Size first**: `pnpm review:size` before opening a PR. Over 3000 reviewed lines,
  the reviewer skips the whole PR; split it instead. CI's `size` job fails an
  oversized feature PR in seconds (promotions are exempt).
- **The reviewer skips `.github/**`, docs and `*.md`** by design: a workflow-only PR
  is "nothing to review" and merges on green CI plus the builder's own tests.
- **Promotions** (development → main) are reviewed like any PR (they merge on green
  CI if over the size limit).

1. Comment `/code-reviewer`. The first run covers the whole PR. Drafts, forks and
   Dependabot are skipped.
2. Verify each finding against the code, and against the platform's own docs when it
   cites them. A finding is a claim to check, not an instruction: the reviewer has
   been wrong (backend #393, Daily's payload shape).
3. Fix what's real: P0 and P1 always, P2 if cheap. Each fix gets a failing-first test.
4. Answer every finding in ONE reply comment on the PR: "fixed in <sha> + the test",
   "not changed + why", or "deferred to #issue". The next review reads the bot's
   comments and replies from people with write access, and won't re-raise an answered
   finding.
5. Comment `/code-reviewer` to re-review the commits since the last review. From Git
   Bash, `MSYS_NO_PATHCONV=1`, or the leading `/` becomes a Windows path.
6. Repeat 2–5 until a review says NO FINDINGS, or only P2s the owner accepts.
7. Merge when that's true AND CI is green on the PR's exact head commit.

A reply alone never starts a review; only a comment starting `/code-reviewer` does.
**A comment runs the workflow from `main`, not from the PR**, so a change to the
workflow itself is tested only after it merges.

The reviewer posts one comment with P0/P1/P2 findings (`AGENTS.md` → Severity);
answer each finding in a PR comment.
