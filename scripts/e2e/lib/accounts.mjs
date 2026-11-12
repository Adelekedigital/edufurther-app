/**
 * Signs the runner in as a seed account through the backend's local
 * `scripts/e2e_session.py`, run with `railway run` so it reads the dev
 * environment's own variables. Tokens and links are secrets: they live in
 * memory only and are never printed or written to the report.
 */
import { spawnSync } from 'node:child_process';

const RAILWAY = ['run', '--environment', 'development', '--service', 'edufurtherbe-dev'];

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set (see docs/e2e/README.md)`);
  return value;
}

// Refs and tags reach a shell on Windows: only what the seed itself allows.
const SAFE = /^[a-z0-9_]{1,40}$/;

function sessionScript(beRepo, run, ref, mode, redirect) {
  if (!SAFE.test(run) || !SAFE.test(ref)) throw new Error(`refused account ${JSON.stringify(ref)}`);
  const args = [
    ...RAILWAY,
    'uv',
    'run',
    'python',
    'scripts/e2e_session.py',
    '--env',
    'staging',
    '--run',
    run,
    '--account',
    ref,
    mode,
  ];
  if (redirect) args.push('--redirect', redirect);
  const out = spawnSync('railway', args, {
    cwd: beRepo,
    // Windows ships railway as a .cmd shim, which needs a shell.
    shell: process.platform === 'win32',
    encoding: 'utf8',
    timeout: 180_000,
    env: { ...process.env, E2E_ALLOW: '1', E2E_SUPABASE_PROJECT: required('E2E_SUPABASE_PROJECT') },
  });
  const value = (out.stdout || '').trim();
  if (out.status !== 0 || !value) {
    // stderr carries what happened, never the secret.
    throw new Error(
      `e2e_session.py ${mode} for ${ref} failed: ${(out.stderr || '').trim().split('\n').pop()}`,
    );
  }
  return value;
}

/** `known` is a plain object of ref -> id, persisted by the caller across sittings. */
export function createAccounts({ beRepo, run, apiUrl, known = {} }) {
  const tokens = new Map();
  const ids = {
    has: (ref) => ref in known,
    get: (ref) => known[ref],
    set: (ref, value) => {
      known[ref] = value;
    },
  };

  // Supabase access tokens last an hour: mint again after 50 minutes, so a long
  // sitting never reports an expired token as a product 401.
  const TOKEN_TTL = 50 * 60_000;
  function token(ref) {
    const held = tokens.get(ref);
    if (held && Date.now() - held.at < TOKEN_TTL) return held.value;
    const value = sessionScript(beRepo, run, ref, '--token');
    tokens.set(ref, { value, at: Date.now() });
    return value;
  }

  // On Windows a shell is used, so the redirect's query must be quoted.
  function link(ref, redirect) {
    const quoted = process.platform === 'win32' ? `"${redirect}"` : redirect;
    return sessionScript(beRepo, run, ref, '--link', quoted);
  }

  async function id(ref) {
    if (!ids.has(ref)) {
      const res = await fetch(`${apiUrl}/api/v1/me`, {
        headers: { Authorization: `Bearer ${token(ref)}` },
      });
      if (!res.ok) throw new Error(`GET /me as ${ref} answered ${res.status}`);
      ids.set(ref, (await res.json()).id);
    }
    return ids.get(ref);
  }

  function remember(ref, value) {
    if (!ids.has(ref)) ids.set(ref, value);
  }

  return { token, link, id, remember };
}
