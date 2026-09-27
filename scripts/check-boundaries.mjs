#!/usr/bin/env node
/**
 * check-boundaries.mjs — the mechanical half of the frontend standards.
 *
 * Three rules, zero dependencies:
 *
 *   1. No component imports the generated API client.
 *      One contract change should touch one directory, not thirty components.
 *
 *   2. Imports never point upward.
 *      atom -> molecule -> organism -> template -> page, one way, always.
 *      A level that reaches up can no longer render in isolation.
 *
 *   3. No raw hex in components.
 *      A literal is a copy no design update will ever reach.
 *
 * Exit codes:
 *   0  clean
 *   1  violations found
 *   2  misconfigured — including "scanned zero files", because a check that
 *      finds nothing to scan must fail rather than report green while
 *      enforcing nothing.
 *
 * Config is optional. Add to package.json only when the defaults are wrong:
 *
 *   {
 *     "checkBoundaries": {
 *       "root": "src",
 *       "clientModules": ["lib/api/generated"],
 *       "vendorSeams": { "@vendor/sdk": ["lib/vendor"] },
 *       "allowRawHex": ["components/brand", "components/icons"],
 *       "ignore": ["**\/*.stories.tsx"]
 *     }
 *   }
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, resolve, sep, posix } from 'node:path';

// ---------------------------------------------------------------- config ----

const CWD = process.cwd();
const ARGS = process.argv.slice(2);
const JSON_OUT = ARGS.includes('--json');
const QUIET = ARGS.includes('--quiet');

const DEFAULTS = {
  // Candidate roots, tried in order. The first that exists wins, so this is
  // safe in a repo that has not settled on src/ yet.
  roots: ['src', 'app', '.'],
  clientModules: ['lib/api/generated', 'lib/api/client', 'api/generated'],
  vendorSeams: {},
  allowRawHex: [],
  ignore: [],
};

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs'];

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.next', '.nuxt', '.svelte-kit', '.turbo', '.vercel',
  'dist', 'build', 'out', 'coverage', 'storybook-static', '__snapshots__',
  '.cache', 'public', 'playwright-report', 'test-results', '.claude',
]);

/**
 * The two naming schemes. Numbers are the only thing that matters: a file may
 * import its own level and anything below it, never above.
 *
 * Both schemes coexist deliberately. A repo mid-migration has some of each, and
 * a checker that only understands the new names reports green on the old half.
 */
const LEVELS = {
  // atomic design
  atoms: 1, molecules: 2, organisms: 3, templates: 4,
  // the older naming this package used to ship
  ui: 1, patterns: 2, states: 3, layout: 4,
};
const PAGE_DIRS = ['app', 'pages', 'routes', 'views', 'screens'];
const PAGE_LEVEL = 5;

function loadConfig() {
  const pkgPath = join(CWD, 'package.json');
  let user = {};
  if (existsSync(pkgPath)) {
    try {
      user = JSON.parse(readFileSync(pkgPath, 'utf8')).checkBoundaries ?? {};
    } catch (err) {
      fail(`package.json is not valid JSON: ${err.message}`);
    }
  }
  if (user.root && user.roots) {
    fail('config: set either "root" or "roots", not both.');
  }
  const roots = user.roots ?? (user.root ? [user.root] : DEFAULTS.roots);
  for (const key of ['clientModules', 'allowRawHex', 'ignore']) {
    if (user[key] !== undefined && !Array.isArray(user[key])) {
      fail(`config: "${key}" must be an array.`);
    }
  }
  if (user.vendorSeams !== undefined
      && (typeof user.vendorSeams !== 'object' || Array.isArray(user.vendorSeams))) {
    fail('config: "vendorSeams" must be an object of { module: [allowed dirs] }.');
  }
  return {
    roots,
    clientModules: user.clientModules ?? DEFAULTS.clientModules,
    vendorSeams: user.vendorSeams ?? DEFAULTS.vendorSeams,
    allowRawHex: user.allowRawHex ?? DEFAULTS.allowRawHex,
    ignore: user.ignore ?? DEFAULTS.ignore,
    explicitRoot: Boolean(user.root || user.roots),
  };
}

function fail(msg) {
  process.stderr.write(`check-boundaries: ${msg}\n`);
  process.exit(2);
}

// ------------------------------------------------------------------ walk ----

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      walk(full, out);
    } else if (entry.isFile()) {
      if (EXTENSIONS.some((ext) => entry.name.endsWith(ext))) out.push(full);
    }
  }
  return out;
}

/** Turn a glob-ish ignore pattern into a RegExp. Deliberately small. */
function globToRe(glob) {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*\//g, '\u0000')
    .replace(/\*/g, '[^/]*')
    .replace(/\u0000/g, '(?:.*/)?')
    .replace(/\?/g, '[^/]');
  return new RegExp(`^${escaped}$`);
}

// ---------------------------------------------------------------- levels ----

/** The architectural level of a repo-relative posix path, or null if untiered. */
function levelOf(relPath) {
  const parts = relPath.split('/');
  // A page directory only counts at the front of the path, so a component
  // called `views/` deep inside an organism is not mistaken for a route.
  for (let i = 0; i < Math.min(parts.length, 2); i++) {
    if (PAGE_DIRS.includes(parts[i])) return { level: PAGE_LEVEL, name: parts[i] };
  }
  for (const part of parts) {
    if (Object.hasOwn(LEVELS, part)) return { level: LEVELS[part], name: part };
  }
  return null;
}

const LEVEL_NAMES = { 1: 'atom', 2: 'molecule', 3: 'organism', 4: 'template', 5: 'page' };

// --------------------------------------------------------------- imports ----

// Matches static imports, `export ... from`, and dynamic import() — enough
// without pulling in a parser. Template-literal specifiers are not resolvable
// statically and are skipped on purpose.
const IMPORT_RE =
  /(?:^|[\s;])(?:import|export)\s+(?:[\s\S]*?\sfrom\s*)?['"]([^'"]+)['"]|(?:^|[^.\w])import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function importsOf(source) {
  const found = [];
  for (const m of source.matchAll(IMPORT_RE)) {
    const spec = m[1] ?? m[2] ?? m[3];
    if (spec) found.push(spec);
  }
  return found;
}

/**
 * Resolve an import specifier to a repo-relative posix path, or null when it is
 * a bare package we do not track.
 *
 * Handles the two aliases this package assumes — `@/` and `~/` — plus relative
 * paths. If your alias is something else, the upward-import rule cannot see it;
 * that limitation is documented rather than guessed at.
 */
function resolveSpec(spec, fromFileRel, rootRel) {
  if (spec.startsWith('./') || spec.startsWith('../')) {
    const abs = resolve(dirname(join(CWD, fromFileRel)), spec);
    return toPosix(relative(CWD, abs));
  }
  if (spec.startsWith('@/') || spec.startsWith('~/')) {
    const tail = spec.slice(2);
    return rootRel && rootRel !== '.' ? posix.join(rootRel, tail) : tail;
  }
  return null;
}

const toPosix = (p) => p.split(sep).join('/');

/** Does `relPath` sit inside any of `dirs` (repo-relative, posix)? */
function within(relPath, dirs, rootRel) {
  return dirs.some((d) => {
    const clean = toPosix(d).replace(/^\.\//, '').replace(/\/$/, '');
    const candidates = rootRel && rootRel !== '.'
      ? [clean, posix.join(rootRel, clean)]
      : [clean];
    return candidates.some((c) => relPath === c || relPath.startsWith(`${c}/`));
  });
}

// ------------------------------------------------------------- hex rule -----

// Six- and three-digit hex, with optional alpha. Requires a word boundary
// before the # so `#fff` in a URL fragment or an id selector is not flagged.
const HEX_RE = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;

// Colours that are not design decisions. Pure black/white in a box-shadow or an
// overlay is a mechanism, not a brand token, and flagging it trains people to
// ignore the checker.
const HEX_ALLOWLIST = new Set(['#000', '#fff', '#000000', '#ffffff', '#0000', '#00000000']);

function stripCommentsAndImports(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
    .replace(/^\s*(?:import|export)[^\n]*from[^\n]*$/gm, '');
}

// ------------------------------------------------------------------ main ----

const config = loadConfig();

const rootRel = (() => {
  for (const r of config.roots) {
    const clean = toPosix(r).replace(/^\.\//, '').replace(/\/$/, '') || '.';
    if (existsSync(join(CWD, clean))) return clean;
  }
  return null;
})();

if (rootRel === null) {
  fail(
    `none of these roots exist: ${config.roots.join(', ')}\n` +
    `  Set "checkBoundaries": { "root": "<your source dir>" } in package.json.`
  );
}

const ignoreRes = config.ignore.map(globToRe);
const rootAbs = rootRel === '.' ? CWD : join(CWD, rootRel);

const files = walk(rootAbs)
  .map((f) => toPosix(relative(CWD, f)))
  .filter((f) => !ignoreRes.some((re) => re.test(f)))
  .sort();

if (files.length === 0) {
  fail(
    `scanned zero files under "${rootRel}".\n` +
    `  A check that finds nothing to scan reports green while enforcing nothing,\n` +
    `  so this is an error, not a pass. Wrong directory, or "root" needs setting\n` +
    `  in package.json.`
  );
}

const violations = [];

function report(rule, file, line, message) {
  violations.push({ rule, file, line, message });
}

function lineOf(source, index) {
  return source.slice(0, index).split('\n').length;
}

for (const file of files) {
  let source;
  try {
    source = readFileSync(join(CWD, file), 'utf8');
  } catch (err) {
    fail(`cannot read ${file}: ${err.message}`);
  }

  const here = levelOf(file);
  const isComponentish = here !== null && here.level < PAGE_LEVEL;

  // ---- rule 1 + 2 + vendor seams, per import
  for (const spec of importsOf(source)) {
    const resolved = resolveSpec(spec, file, rootRel);

    // rule 1 — only the page fetches data. Everything below it receives props.
    if (isComponentish && resolved && within(resolved, config.clientModules, rootRel)) {
      const idx = source.indexOf(spec);
      report(
        'client-import',
        file,
        idx >= 0 ? lineOf(source, idx) : 1,
        `${LEVEL_NAMES[here.level]} imports the generated API client (${spec}). ` +
        `Only the page fetches; pass the data down.`
      );
    }

    // vendor seams — a vendor SDK enters the codebase in one place or it is
    // everywhere, and then it cannot be replaced.
    for (const [mod, allowed] of Object.entries(config.vendorSeams)) {
      const isMod = spec === mod || spec.startsWith(`${mod}/`);
      if (isMod && !within(file, allowed, rootRel)) {
        const idx = source.indexOf(spec);
        report(
          'vendor-seam',
          file,
          idx >= 0 ? lineOf(source, idx) : 1,
          `imports ${spec} outside its seam. Allowed only in: ${allowed.join(', ')}.`
        );
      }
    }

    // rule 2 — imports never point upward.
    if (here && resolved) {
      const there = levelOf(resolved);
      if (there && there.level > here.level) {
        const idx = source.indexOf(spec);
        report(
          'upward-import',
          file,
          idx >= 0 ? lineOf(source, idx) : 1,
          `${LEVEL_NAMES[here.level]} imports a ${LEVEL_NAMES[there.level]} (${spec}). ` +
          `A level that reaches up can no longer render in isolation.`
        );
      }
    }
  }

  // ---- rule 3 — no raw hex in components
  if (isComponentish && !within(file, config.allowRawHex, rootRel)) {
    const body = stripCommentsAndImports(source);
    const seen = new Set();
    for (const m of body.matchAll(HEX_RE)) {
      const hex = m[0].toLowerCase();
      if (HEX_ALLOWLIST.has(hex) || seen.has(hex)) continue;
      seen.add(hex);
      const idx = source.indexOf(m[0]);
      report(
        'raw-hex',
        file,
        idx >= 0 ? lineOf(source, idx) : 1,
        `raw colour ${m[0]}. A literal is a copy no design update will reach — ` +
        `use a token. Legitimate exceptions go in "allowRawHex".`
      );
    }
  }
}

// ---------------------------------------------------------------- output ----

if (JSON_OUT) {
  process.stdout.write(`${JSON.stringify(
    { root: rootRel, scanned: files.length, violations },
    null,
    2,
  )}\n`);
  process.exit(violations.length ? 1 : 0);
}

const byRule = violations.reduce((acc, v) => {
  (acc[v.rule] ??= []).push(v);
  return acc;
}, {});

const RULE_TITLES = {
  'client-import': 'No component imports the generated API client',
  'upward-import': 'Imports never point upward',
  'raw-hex': 'No raw hex in components',
  'vendor-seam': 'A vendor SDK enters through one seam',
};

if (!QUIET || violations.length) {
  process.stdout.write(`check-boundaries: scanned ${files.length} file(s) under "${rootRel}"\n`);
}

if (violations.length === 0) {
  if (!QUIET) process.stdout.write('  clean\n');
  process.exit(0);
}

for (const [rule, items] of Object.entries(byRule)) {
  process.stdout.write(`\n  ${RULE_TITLES[rule] ?? rule}  (${items.length})\n`);
  for (const v of items) {
    process.stdout.write(`    ${v.file}:${v.line}\n      ${v.message}\n`);
  }
}

process.stdout.write(
  `\n  ${violations.length} violation(s). Fix them, or relax the config in ` +
  `package.json and tighten later.\n` +
  `  The one worth keeping strict from day one is client-import.\n`
);
process.exit(1);
