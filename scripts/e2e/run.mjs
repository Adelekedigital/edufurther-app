#!/usr/bin/env node
/**
 * run.mjs — run the launch E2E scenarios (backend repo docs/e2e/scenarios.yaml)
 * against the dev pair: API steps over HTTP, UI steps in Playwright.
 *
 *   E2E_SUPABASE_PROJECT=<ref> E2E_API_URL=<api> E2E_FRONTEND_URL=<app> \
 *   node scripts/e2e/run.mjs --be ../edufurtherBE --run <tag> --only BOOK-001 \
 *     --out <scratch dir> [--kinds api,ui] [--jobs] [--from ID:step] [--stop ID:step]
 *
 * - `--run` is the tag the seed was given (`seed_demo_mentors.py --e2e <tag>`).
 * - Saved values persist in `<out>/state.json`, so a second sitting (`--from`)
 *   reads the session ids the first one booked.
 * - `kind: job` steps run only with `--jobs` (they act on the whole dev
 *   database, as the scheduled job would). `check: db` assertions are the
 *   backend agent's: reported as skipped.
 * - Writes `<out>/results.json` in the run-report shape and a screenshot per
 *   UI step and width. Tokens and links are never written anywhere.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createAccounts } from './lib/accounts.mjs';
import { runApiStep } from './lib/api.mjs';
import { runUiStep } from './lib/ui.mjs';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const flag = (name) => args.includes(`--${name}`);

const beRepo = resolve(opt('be', '../edufurtherBE'));
// The YAML can come from a worktree; railway stays linked to the main checkout.
const scenariosFile = resolve(opt('scenarios', join(beRepo, 'docs/e2e/scenarios.yaml')));
const run = opt('run');
const outDir = resolve(opt('out', '.e2e'));
const only = opt('only')?.split(',');
const kinds = opt('kinds', 'api,ui,job').split(',');
const from = opt('from');
const stop = opt('stop', '').split(',');
if (!run) {
  console.error('--run <tag> is required');
  process.exit(2);
}

const apiUrl = process.env.E2E_API_URL;
const frontendUrl = process.env.E2E_FRONTEND_URL;
const projectRef = process.env.E2E_SUPABASE_PROJECT;
if (!apiUrl || !frontendUrl || !projectRef) {
  console.error('Set E2E_API_URL, E2E_FRONTEND_URL and E2E_SUPABASE_PROJECT (docs/e2e/README.md)');
  process.exit(2);
}

function loadScenarios() {
  const file = scenariosFile;
  const py =
    'import json,sys,yaml; json.dump(yaml.safe_load(open(sys.argv[1],encoding="utf-8")),sys.stdout)';
  const out = spawnSync('uv', ['run', 'python', '-c', py, file], { cwd: beRepo, encoding: 'utf8' });
  if (out.status !== 0) throw new Error(`could not read scenarios.yaml: ${out.stderr}`);
  return JSON.parse(out.stdout);
}

mkdirSync(outDir, { recursive: true });
const statePath = join(outDir, 'state.json');
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : { run };
// Saved ids belong to one run's accounts: another tag in the same folder would
// act on the wrong people.
if (state.run !== run) {
  console.error(`${statePath} belongs to run ${state.run}; use another --out for ${run}`);
  process.exit(2);
}
state.ids ??= {};
const accounts = createAccounts({ beRepo, run, apiUrl, known: state.ids });

function makeScope(key, each) {
  state[key] ??= { saved: {} };
  const sent = {};
  return {
    each,
    save(name, value) {
      state[key].saved[name] = value;
    },
    record(id, req) {
      sent[id] = req;
    },
    sent(id) {
      if (!sent[id]) throw new Error(`<same as ${id}>: step ${id} has not run in this sitting`);
      return sent[id];
    },
    async resolve(name) {
      const m = /^([a-z_]+)\.(id|email)$/.exec(name);
      if (m) {
        const ref = m[1] === 'each' ? each : m[1];
        // The seed's address shape (demo_seed.e2e_email): reserved .test domain, no inbox.
        return m[2] === 'id'
          ? accounts.id(ref)
          : `e2e-${run}-${ref.replace(/_/g, '-')}@demo.edufurther.test`;
      }
      if (!(name in state[key].saved)) throw new Error(`\${${name}} was never saved`);
      return state[key].saved[name];
    },
  };
}

// Job steps go through a shell on Windows: only plain script paths and flags.
const SAFE_ARG = /^[A-Za-z0-9_./=-]+$/;

function runJob(step) {
  const bad = [step.script, ...(step.args ?? [])].find((x) => !SAFE_ARG.test(String(x)));
  if (bad !== undefined)
    return { ok: false, detail: `refused job argument ${JSON.stringify(bad)}` };
  const a = [
    'run',
    '--environment',
    'development',
    '--service',
    'edufurtherbe-dev',
    'uv',
    'run',
    'python',
    step.script,
    ...(step.args ?? []),
  ];
  const out = spawnSync('railway', a, {
    cwd: beRepo,
    shell: process.platform === 'win32',
    encoding: 'utf8',
    timeout: 600_000,
  });
  const want = step.expect?.exit ?? 0;
  return {
    ok: out.status === want,
    detail: `exit ${out.status}${out.status === want ? '' : `: ${(out.stderr || '').trim().split('\n').pop()}`}`,
  };
}

const doc = loadScenarios();
const { chromium } = await import('playwright');
const browser = kinds.includes('ui') ? await chromium.launch() : null;
const results = [];
const startedAt = new Date().toISOString();

for (const scenario of doc.scenarios) {
  if (only && !only.includes(scenario.id)) continue;
  if (!scenario.steps.length) {
    results.push({ id: scenario.id, result: 'skipped', step: null, detail: 'no steps yet' });
    continue;
  }
  const passes = scenario.for_each ?? [null];
  for (const each of passes) {
    const key = each ? `${scenario.id}:${each}` : scenario.id;
    const scope = makeScope(key, each);
    let started = !from || !from.startsWith(`${scenario.id}:`);
    const row = { id: key, result: 'pass', step: null, defect: null, steps: [] };
    let checked = 0;
    for (const step of [
      ...scenario.steps,
      ...(scenario.assertions ?? []).map((a) => ({ ...a, kind: `assert-${a.check}` })),
    ]) {
      if (!started) {
        started = from === `${scenario.id}:${step.id}`;
        if (!started) continue;
      }
      if (stop.includes(`${scenario.id}:${step.id}`)) {
        row.steps.push({ id: step.id, result: 'pending', detail: 'second sitting' });
        row.pending = step.id;
        break;
      }
      let r;
      try {
        if (step.kind === 'api' || step.kind === 'assert-api')
          r = kinds.includes('api') ? await runApiStep(step, scope, { apiUrl, accounts }) : null;
        else if (step.kind === 'ui')
          r = kinds.includes('ui')
            ? await runUiStep(step, scope, {
                browser,
                accounts,
                frontendUrl,
                projectRef,
                outDir,
                fixtures: join(import.meta.dirname, 'fixtures'),
                label: `${key.replace(':', '-')}-${step.id}`,
              })
            : null;
        else if (step.kind === 'job')
          r = flag('jobs') ? runJob(step) : { skipped: true, detail: 'job (needs --jobs)' };
        else r = { skipped: true, detail: 'db assertion (backend agent)' };
      } catch (e) {
        r = { ok: false, detail: e.message.split('\n')[0] };
      }
      if (!r) continue;
      const result = r.skipped ? 'skipped' : r.blocked ? 'blocked' : r.ok ? 'pass' : 'fail';
      row.steps.push({ id: step.id, kind: step.kind, result, detail: r.detail });
      if (result !== 'skipped') checked += 1;
      console.log(`${key.padEnd(34)} ${step.id.padEnd(22)} ${result.padEnd(7)} ${r.detail}`);
      if ((result === 'fail' || result === 'blocked') && row.result === 'pass') {
        row.result = result;
        row.step = step.id;
      }
      writeFileSync(statePath, JSON.stringify(state, null, 2));
    }
    // A row is a pass only when something was checked and nothing is still due.
    if (row.result === 'pass' && checked === 0) {
      row.result = 'skipped';
      row.detail = from?.startsWith(`${scenario.id}:`)
        ? `--from ${from} matched no step`
        : 'nothing ran';
    } else if (row.result === 'pass' && row.pending) row.result = 'partial';
    results.push(row);
  }
}
await browser?.close();

const report = {
  env: 'staging',
  sha: process.env.E2E_SHA ?? null,
  runner: 'agent (scripts/e2e/run.mjs)',
  run,
  started_at: startedAt,
  results,
};
const name = `results-${Date.now()}.json`;
writeFileSync(join(outDir, name), JSON.stringify(report, null, 2));
const count = (r) => results.filter((x) => x.result === r).length;
console.log(
  `\n${count('pass')} pass, ${count('partial')} partial (a sitting due), ${count('fail')} fail, ${count('blocked')} blocked, ${count('skipped')} skipped. Report: ${join(outDir, name)}`,
);
process.exitCode = count('fail') || count('blocked') ? 1 : 0;
