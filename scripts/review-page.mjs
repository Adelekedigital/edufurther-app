#!/usr/bin/env node
/**
 * review-page.mjs — drive the page before calling it done.
 *
 * Reading the code tells you what should render. Driving it tells you what does.
 *
 *   node scripts/review-page.mjs /posts
 *   node scripts/review-page.mjs /posts --states     # force the failure path
 *   node scripts/review-page.mjs /posts --base http://localhost:5173
 *
 * At each width (390px and 1440px) it captures:
 *   - a full-page screenshot
 *   - console errors and failed/4xx requests, WITH the URL
 *   - horizontal overflow, and which element causes it
 *   - a keyboard focus-order trace, flagging any stop with no visible ring
 *   - an axe accessibility scan
 *   - Core Web Vitals and transfer weight, checked against budgets
 *
 * Budgets live in package.json and are meant to be edited:
 *
 *   { "reviewPage": {
 *       "baseUrl": "http://localhost:3000",
 *       "widths": [390, 1440],
 *       "outDir": ".review",
 *       "budgets": { "lcpMs": 2500, "cls": 0.1, "jsKb": 250, "totalKb": 1000 }
 *   } }
 *
 * On an existing project, set the budgets to your CURRENT numbers and ratchet
 * down. A budget set at the ideal on day one fails every build for something
 * nobody in that PR caused, and gets disabled within a week.
 *
 * What this does NOT measure:
 *   - INP needs a real interaction, so it is absent rather than reported as a
 *     meaningless zero.
 *   - Weight is summed from content-length. A response without that header is
 *     not counted, so this can read lower than your network tab.
 *   - These are lab numbers on your machine's connection. Field data beats them.
 *
 * Exit codes:
 *   0  everything within budget, no errors, no a11y violations
 *   1  something failed — budget exceeded, console error, overflow, a11y
 *   2  could not run (no Playwright, no server, bad arguments)
 *
 * Playwright and @axe-core/playwright are optional. Without them the script
 * degrades and says which part it skipped rather than failing silently.
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CWD = process.cwd();
const argv = process.argv.slice(2);

const DEFAULTS = {
  baseUrl: process.env.REVIEW_BASE_URL || 'http://localhost:3000',
  widths: [390, 1440],
  outDir: '.review',
  height: 900,
  budgets: { lcpMs: 2500, cls: 0.1, jsKb: 250, totalKb: 1000 },
  // Paths whose console noise is not yours. Kept short on purpose.
  ignoreConsole: ['favicon.ico', 'Download the React DevTools'],
};

function die(msg, code = 2) {
  process.stderr.write(`review-page: ${msg}\n`);
  process.exit(code);
}

// ------------------------------------------------------------------ args ----

const flags = new Set(argv.filter((a) => a.startsWith('--')));
const positional = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--base') { DEFAULTS.baseUrl = argv[++i]; continue; }
  if (argv[i].startsWith('--base=')) { DEFAULTS.baseUrl = argv[i].slice(7); continue; }
  if (argv[i].startsWith('--')) continue;
  positional.push(argv[i]);
}

const route = positional[0] ?? '/';
if (!route.startsWith('/')) die(`route must start with "/" — got "${route}"`);

const FORCE_STATES = flags.has('--states');
const JSON_OUT = flags.has('--json');

// ---------------------------------------------------------------- config ----

let userCfg = {};
const pkgPath = join(CWD, 'package.json');
if (existsSync(pkgPath)) {
  try {
    userCfg = JSON.parse(readFileSync(pkgPath, 'utf8')).reviewPage ?? {};
  } catch (err) {
    die(`package.json is not valid JSON: ${err.message}`);
  }
}

const cfg = {
  ...DEFAULTS,
  ...userCfg,
  budgets: { ...DEFAULTS.budgets, ...(userCfg.budgets ?? {}) },
  ignoreConsole: [...DEFAULTS.ignoreConsole, ...(userCfg.ignoreConsole ?? [])],
};
if (!Array.isArray(cfg.widths) || cfg.widths.length === 0) {
  die('config: "widths" must be a non-empty array of numbers.');
}

const outDir = join(CWD, cfg.outDir);
const skipped = [];

// ----------------------------------------------------------- playwright -----

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  die(
    'playwright is not installed.\n' +
    '  pnpm add -D playwright && pnpm exec playwright install chromium\n' +
    '  (or npm i -D playwright && npx playwright install chromium)'
  );
}

let AxeBuilder = null;
try {
  ({ default: AxeBuilder } = await import('@axe-core/playwright'));
} catch {
  skipped.push('axe accessibility scan (@axe-core/playwright not installed)');
}

const launchOpts = {};
if (process.env.REVIEW_BROWSER_PATH) {
  launchOpts.executablePath = process.env.REVIEW_BROWSER_PATH;
}

let browser;
try {
  browser = await chromium.launch(launchOpts);
} catch (err) {
  die(
    `could not launch a browser: ${err.message}\n` +
    '  Set REVIEW_BROWSER_PATH to an existing Chromium binary if your image ' +
    'ships its own.'
  );
}

// ----------------------------------------------------- in-page collectors ----

/**
 * Web Vitals, collected in the page. LCP and CLS only — INP requires a real
 * interaction and a fabricated zero is worse than an absence.
 */
const VITALS_SCRIPT = `
  window.__vitals = { lcp: null, cls: 0 };
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__vitals.lcp = e.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (!e.hadRecentInput) window.__vitals.cls += e.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {}
`;

/** Sum transfer weight from content-length, bucketed by resource type. */
function makeWeightTracker(page) {
  const weight = { totalBytes: 0, jsBytes: 0, cssBytes: 0, imgBytes: 0, unmeasured: 0 };
  page.on('response', (res) => {
    const headers = res.headers();
    const len = Number(headers['content-length'] ?? NaN);
    const type = res.request().resourceType();
    if (!Number.isFinite(len)) {
      weight.unmeasured += 1;
      return;
    }
    weight.totalBytes += len;
    if (type === 'script') weight.jsBytes += len;
    else if (type === 'stylesheet') weight.cssBytes += len;
    else if (type === 'image') weight.imgBytes += len;
  });
  return weight;
}

// ------------------------------------------------------------------ review ---

async function reviewWidth(width) {
  const result = {
    width,
    url: new URL(route, cfg.baseUrl).toString(),
    screenshot: null,
    consoleErrors: [],
    badRequests: [],
    overflow: null,
    focusStops: [],
    focusIssues: [],
    a11y: null,
    vitals: null,
    weight: null,
    budgetFailures: [],
  };

  const context = await browser.newContext({
    viewport: { width, height: cfg.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.addInitScript(VITALS_SCRIPT);

  const weight = makeWeightTracker(page);

  page.on('console', (msg) => {
    if (msg.type() !== 'error' && msg.type() !== 'warning') return;
    const text = msg.text();
    if (cfg.ignoreConsole.some((frag) => text.includes(frag))) return;
    if (msg.type() === 'error') result.consoleErrors.push(text.slice(0, 300));
  });
  page.on('pageerror', (err) => {
    result.consoleErrors.push(`uncaught: ${err.message}`.slice(0, 300));
  });
  page.on('requestfailed', (req) => {
    result.badRequests.push({
      url: req.url(),
      status: 'failed',
      reason: req.failure()?.errorText ?? 'unknown',
    });
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      result.badRequests.push({ url: res.url(), status: res.status() });
    }
  });

  // --states forces the failure path so the three non-success states are
  // actually looked at. They are the states the design gave you nothing for.
  if (FORCE_STATES) {
    await page.route('**/api/**', (r) => r.fulfill({ status: 500, body: '{"error":"forced"}' }));
    await page.route('**/graphql', (r) => r.fulfill({ status: 500, body: '{"errors":[]}' }));
  }

  try {
    const res = await page.goto(result.url, { waitUntil: 'networkidle', timeout: 30_000 });
    if (!res) throw new Error('no response');
    if (res.status() >= 400 && !FORCE_STATES) {
      result.badRequests.push({ url: result.url, status: res.status(), document: true });
    }
  } catch (err) {
    await context.close();
    result.fatal = `could not load ${result.url}: ${err.message}`;
    return result;
  }

  // ---- screenshot. Look at it. A green report with an unreadable page is
  // still a broken page, and no scan sees "the heading overlaps the card".
  mkdirSync(outDir, { recursive: true });
  const slug = route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'root';
  const suffix = FORCE_STATES ? '-states' : '';
  const shotPath = join(outDir, `${slug}-${width}${suffix}.png`);
  await page.screenshot({ path: shotPath, fullPage: true });
  result.screenshot = shotPath;

  // ---- horizontal overflow, and the element responsible
  result.overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const over = doc.scrollWidth - doc.clientWidth;
    if (over <= 1) return null;
    let worst = null;
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      const past = r.right - doc.clientWidth;
      if (past > 1 && (!worst || past > worst.past)) {
        worst = {
          past: Math.round(past),
          tag: el.tagName.toLowerCase(),
          cls: (el.className || '').toString().slice(0, 60),
        };
      }
    }
    return { by: over, culprit: worst };
  });

  // ---- keyboard focus-order trace, driven from here so Tab actually fires
  await page.evaluate(() => {
    document.body.setAttribute('tabindex', '-1');
    document.body.focus();
  });
  const ringBefore = new Map();
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const stop = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const name =
        el.getAttribute('aria-label') ||
        (el.id ? document.querySelector(`label[for="${el.id}"]`)?.textContent : '') ||
        el.textContent?.trim().slice(0, 40) ||
        el.getAttribute('placeholder') ||
        '';
      return {
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role') || '',
        name: (name || '').replace(/\s+/g, ' ').trim(),
        key: `${el.tagName}:${el.id || ''}:${(el.className || '').toString().slice(0, 40)}`,
        ring: [s.outlineStyle, s.outlineWidth, s.boxShadow].join('|'),
        offscreen: r.width === 0 || r.height === 0,
        visible: s.visibility !== 'hidden' && s.display !== 'none',
      };
    });
    if (!stop) break;
    if (ringBefore.has(stop.key) && result.focusStops.length > 0) break; // wrapped
    ringBefore.set(stop.key, stop.ring);

    const noRing = stop.ring.startsWith('none|0px|none') || stop.ring === 'none|0px|none';
    if (noRing) {
      result.focusIssues.push(
        `no visible focus ring: <${stop.tag}${stop.role ? ` role=${stop.role}` : ''}>` +
        `${stop.name ? ` "${stop.name}"` : ''}`
      );
    }
    if (!stop.name && !['input', 'select', 'textarea'].includes(stop.tag)) {
      result.focusIssues.push(`focus stop with no accessible name: <${stop.tag}>`);
    }
    if (stop.offscreen || !stop.visible) {
      result.focusIssues.push(`focusable but not visible: <${stop.tag}> "${stop.name}"`);
    }
    result.focusStops.push(
      `${stop.tag}${stop.role ? `[${stop.role}]` : ''}${stop.name ? ` "${stop.name}"` : ''}`
    );
  }

  // ---- axe
  if (AxeBuilder) {
    try {
      const scan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      result.a11y = scan.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.length,
        target: v.nodes[0]?.target?.join(' ') ?? '',
      }));
    } catch (err) {
      skipped.push(`axe scan at ${width}px (${err.message})`);
    }
  }

  // ---- vitals + weight
  result.vitals = await page.evaluate(() => ({
    lcp: window.__vitals?.lcp ?? null,
    cls: window.__vitals?.cls ?? null,
  }));
  result.weight = { ...weight };

  const kb = (b) => Math.round(b / 1024);
  const b = cfg.budgets;
  if (result.vitals.lcp != null && b.lcpMs && result.vitals.lcp > b.lcpMs) {
    result.budgetFailures.push(`LCP ${Math.round(result.vitals.lcp)}ms > ${b.lcpMs}ms`);
  }
  if (result.vitals.cls != null && b.cls != null && result.vitals.cls > b.cls) {
    result.budgetFailures.push(`CLS ${result.vitals.cls.toFixed(3)} > ${b.cls}`);
  }
  if (b.jsKb && kb(weight.jsBytes) > b.jsKb) {
    result.budgetFailures.push(`JS ${kb(weight.jsBytes)}kB > ${b.jsKb}kB`);
  }
  if (b.totalKb && kb(weight.totalBytes) > b.totalKb) {
    result.budgetFailures.push(`total ${kb(weight.totalBytes)}kB > ${b.totalKb}kB`);
  }

  await context.close();
  return result;
}

const results = [];
for (const width of cfg.widths) {
  results.push(await reviewWidth(Number(width)));
}
await browser.close();

// ---------------------------------------------------------------- report ----

const kb = (b) => Math.round(b / 1024);
let failed = false;

if (JSON_OUT) {
  writeFileSync(join(outDir, 'review.json'), JSON.stringify({ route, results, skipped }, null, 2));
  process.stdout.write(`${JSON.stringify({ route, results, skipped }, null, 2)}\n`);
} else {
  process.stdout.write(`\nreview-page ${route}${FORCE_STATES ? '  (forced failure state)' : ''}\n`);
  for (const r of results) {
    process.stdout.write(`\n  ${r.width}px — ${r.url}\n`);
    if (r.fatal) {
      process.stdout.write(`    FATAL  ${r.fatal}\n`);
      failed = true;
      continue;
    }
    process.stdout.write(`    screenshot      ${r.screenshot}\n`);

    const lcp = r.vitals?.lcp != null ? `${Math.round(r.vitals.lcp)}ms` : 'n/a';
    const cls = r.vitals?.cls != null ? r.vitals.cls.toFixed(3) : 'n/a';
    process.stdout.write(
      `    vitals          LCP ${lcp}   CLS ${cls}   ` +
      `(INP not measured — needs a real interaction)\n`
    );
    process.stdout.write(
      `    weight          total ${kb(r.weight.totalBytes)}kB   JS ${kb(r.weight.jsBytes)}kB   ` +
      `CSS ${kb(r.weight.cssBytes)}kB   img ${kb(r.weight.imgBytes)}kB` +
      (r.weight.unmeasured ? `   (${r.weight.unmeasured} response(s) sent no content-length)` : '') +
      '\n'
    );

    const line = (label, items, fmt = (x) => x) => {
      if (!items || items.length === 0) {
        process.stdout.write(`    ${label.padEnd(15)} none\n`);
        return;
      }
      failed = true;
      process.stdout.write(`    ${label.padEnd(15)} ${items.length}\n`);
      for (const it of items.slice(0, 10)) {
        process.stdout.write(`      - ${fmt(it)}\n`);
      }
      if (items.length > 10) process.stdout.write(`      ... ${items.length - 10} more\n`);
    };

    line('console errors', r.consoleErrors);
    line('bad requests', r.badRequests, (x) => `${x.status}  ${x.url}`);

    if (r.overflow) {
      failed = true;
      const c = r.overflow.culprit;
      process.stdout.write(
        `    overflow        ${r.overflow.by}px horizontal` +
        (c ? ` — worst: <${c.tag}> ${c.cls ? `.${c.cls}` : ''} (${c.past}px past)` : '') + '\n'
      );
    } else {
      process.stdout.write('    overflow        none\n');
    }

    process.stdout.write(`    focus order     ${r.focusStops.length} stop(s)\n`);
    for (const s of r.focusStops.slice(0, 15)) {
      process.stdout.write(`      ${s}\n`);
    }
    line('focus issues', r.focusIssues);

    if (r.a11y === null) {
      process.stdout.write('    axe             skipped\n');
    } else {
      line('axe violations', r.a11y, (v) => `${v.impact ?? '?'}  ${v.id} — ${v.help} (${v.nodes}) ${v.target}`);
    }

    line('over budget', r.budgetFailures);
  }

  if (skipped.length) {
    process.stdout.write('\n  skipped:\n');
    for (const s of skipped) process.stdout.write(`    - ${s}\n`);
  }

  process.stdout.write(
    '\n  Open the screenshots. A green report with an unreadable page is still a\n' +
    '  broken page, and no scan sees "the heading overlaps the card".\n'
  );
  if (!FORCE_STATES) {
    process.stdout.write('  Then run again with --states — the failure path is where the design gave you nothing.\n');
  }
}

process.exit(failed ? 1 : 0);
