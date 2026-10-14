// @vitest-environment node
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

// scripts/vercel-ignore.mjs decides whether a main push deploys (exit 1) or is
// skipped (exit 0). A wrong skip leaves production on stale code, so each rule
// is checked against a real git history.
const SCRIPT = join(process.cwd(), 'scripts', 'vercel-ignore.mjs');
// Every assertion below runs four real processes — three `git`, then the gate
// script under its own node — so one `it` with three assertions starts twelve.
// That is the point of the test: the rules are checked against real git output
// rather than a stub. It is therefore spawn-bound, and on Windows it was
// exceeding the 15s default and failing intermittently. A timed-out test also
// starves the fork pool and cascades into unrelated files, which is how this
// surfaced — as "flaky tests elsewhere".
//
// Scoped to this file, so nothing else gets a longer leash. If it ever needs
// raising again, cut the spawn count instead: the budget is already generous
// for twelve processes.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

let repo: string;
let base: string;
// Identity through the environment rather than three `git config` runs, and an
// empty template so init copies no global hooks or sample files. Every call here
// spawns a real process, and the setup was spending more of them than its work
// needed.
const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
};
const git = (...args: string[]) =>
  execFileSync('git', args, { cwd: repo, encoding: 'utf8', env: GIT_ENV }).trim();
const write = (path: string, text: string) => {
  mkdirSync(dirname(join(repo, path)), { recursive: true });
  writeFileSync(join(repo, path), text);
};
const run = (prev: string | undefined) =>
  spawnSync('node', [SCRIPT], {
    cwd: repo,
    env: { ...process.env, VERCEL_GIT_PREVIOUS_SHA: prev ?? '' },
  }).status;
/** From the base commit, apply a change, commit it, and run the gate. */
const after = (change: () => void) => {
  git('checkout', '-q', '-B', `case-${Math.random().toString(36).slice(2)}`, base);
  change();
  git('add', '-A');
  git('commit', '-q', '-m', 'change');
  return run(base);
};

beforeAll(() => {
  repo = mkdtempSync(join(tmpdir(), 'vercel-ignore-'));
  git('-c', 'init.defaultBranch=main', 'init', '-q', '--template=');
  write('src/a.ts', 'export const a = 1;\n');
  write('docs/x.md', '# x\n');
  write('public/notes.md', '# public\n');
  write('README.md', '# readme\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  base = git('rev-parse', 'HEAD');
});
afterAll(() => rmSync(repo, { recursive: true, force: true }));

describe('vercel-ignore (exit 0 skips, 1 builds)', () => {
  // One case per test, not three in one. Each case spends four real
  // processes, so three in a single `it` spent twelve against one timeout -
  // and in a full-suite run, with every worker contending for process
  // creation, that reached 64s and failed even with the 60s budget. PR 237
  // verified this file against `src/lib/utils` alone, which was too narrow a
  // scope to see it. Split, each case has its own budget and none is near it.
  it('skips a push that only changes docs', () => {
    expect(after(() => write('docs/x.md', '# changed\n'))).toBe(0);
  });

  it('skips a push that only changes root Markdown', () => {
    expect(after(() => write('README.md', '# changed\n'))).toBe(0);
  });

  it('skips a push that only changes tests', () => {
    expect(after(() => write('src/a.test.ts', 'test\n'))).toBe(0);
  });

  it('builds when deployed code changes', () => {
    expect(after(() => write('src/a.ts', 'export const a = 2;\n'))).toBe(1);
  });

  it('builds when code is renamed into a test name (both paths count)', () => {
    expect(after(() => renameSync(join(repo, 'src/a.ts'), join(repo, 'src/a.test.ts')))).toBe(1);
  });

  it('builds when Markdown that the site serves (public/) changes', () => {
    expect(after(() => write('public/notes.md', '# changed\n'))).toBe(1);
  });

  it('builds when it can’t tell: no previous deploy, or an unknown one', () => {
    expect(run(undefined)).toBe(1);
    expect(run('0000000000000000000000000000000000000000')).toBe(1);
  });
});
