// @vitest-environment node
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

// scripts/vercel-ignore.mjs decides whether a main push deploys (exit 1) or is
// skipped (exit 0). A wrong skip leaves production on stale code, so each rule
// is checked against a real git history.
const SCRIPT = join(process.cwd(), 'scripts', 'vercel-ignore.mjs');
let repo: string;
let base: string;
const git = (...args: string[]) =>
  execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
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
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'test');
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
  it('skips a push that only changes docs, root Markdown or tests', () => {
    expect(after(() => write('docs/x.md', '# changed\n'))).toBe(0);
    expect(after(() => write('README.md', '# changed\n'))).toBe(0);
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
