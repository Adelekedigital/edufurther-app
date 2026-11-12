/**
 * Runs one `kind: ui` step at each viewport: sign in, open the route, do the
 * actions, check the expectations, screenshot, axe. Targets are accessible
 * role + name or a label, never CSS (docs/e2e/README.md).
 */
import { join } from 'node:path';
import { fill } from './values.mjs';
import { signIn } from './signin.mjs';

const WAIT = 20_000;
const PACE = 300;

/** `/text/flags` in a name is a regex; anything else is an exact name. */
function nameOf(name) {
  const m = /^\/(.+)\/([a-z]*)$/.exec(name);
  return m ? new RegExp(m[1], m[2]) : name;
}

function locate(page, target) {
  if (target.label) return page.getByLabel(nameOf(target.label), { exact: true }).first();
  return page.getByRole(target.role, { name: nameOf(target.name), exact: true }).first();
}

function describe(target) {
  return target.label ? `label "${target.label}"` : `${target.role} "${target.name}"`;
}

/**
 * Clicks in short tries: the consent banner can appear after the page loads and
 * cover the target, so it is hidden again between tries.
 */
async function clickPast(page, el) {
  const end = Date.now() + WAIT;
  for (;;) {
    try {
      await el.click({ timeout: 3_000 });
      return;
    } catch (e) {
      if (Date.now() > end) throw e;
      await hideConsentBanner(page);
      // A fixed top bar can sit over a target scrolled to the very top.
      await el.evaluate((n) => n.scrollIntoView({ block: 'center' })).catch(() => {});
    }
  }
}

/** The first line of a Playwright error, plus the call-log line that says why. */
function why(e) {
  const lines = e.message.replace(/\x1b\[[0-9;]*m/g, '').split('\n');
  const reason = lines
    .filter((l) => /intercepts|not visible|not enabled|unstable|resolved to/.test(l))
    .slice(-1)[0];
  return reason ? `${lines[0]} | ${reason.trim()}` : lines[0];
}

async function act(page, raw, scope, fixtures) {
  // Names may carry ${...} too (a seed account's email in the preview picker).
  const action = await fill(raw, scope);
  const { value } = action;
  const el = action.target ? locate(page, action.target) : null;
  switch (action.do) {
    case 'click':
      // Slot and choice radios are visually hidden inputs inside a styled label:
      // a real click lands on the label, so click the input itself.
      if (action.target.role === 'radio' || action.target.role === 'checkbox') {
        await el.waitFor({ state: 'attached', timeout: WAIT });
        await el.evaluate((n) => n.click());
      } else await clickPast(page, el);
      break;
    case 'fill':
      await el.fill(String(value), { timeout: WAIT });
      break;
    case 'select':
      await el.selectOption(String(value), { timeout: WAIT });
      break;
    case 'press':
      if (el) await el.press(String(value), { timeout: WAIT });
      else await page.keyboard.press(String(value));
      break;
    case 'upload':
      await el.setInputFiles(join(fixtures, String(value)), { timeout: WAIT });
      break;
    case 'wait':
      await el.waitFor({ state: 'visible', timeout: Number(value) > 0 ? Number(value) : WAIT });
      break;
    default:
      throw new Error(`unknown action ${action.do}`);
  }
}

async function expectOne(page, raw, scope) {
  const want = await fill(raw, scope);
  if (want.visible) {
    await locate(page, want.visible)
      .waitFor({ state: 'visible', timeout: WAIT })
      .catch(() => {
        throw new Error(`not visible: ${describe(want.visible)}`);
      });
  }
  if (want.hidden) {
    await locate(page, want.hidden)
      .waitFor({ state: 'hidden', timeout: WAIT })
      .catch(() => {
        throw new Error(`still visible: ${describe(want.hidden)}`);
      });
  }
  if (want.url !== undefined) {
    const path = await fill(want.url, scope);
    await page
      .waitForURL((u) => u.pathname + u.search === path || u.pathname === path, { timeout: WAIT })
      .catch(() => {
        throw new Error(`url ${new URL(page.url()).pathname}, expected ${path}`);
      });
  }
  if (want.text !== undefined) {
    const text = await fill(want.text, scope);
    await page
      .getByText(text, { exact: false })
      .first()
      .waitFor({ state: 'visible', timeout: WAIT })
      .catch(() => {
        throw new Error(`text not shown: "${text}"`);
      });
  }
  if (want.count !== undefined && want.target) {
    const n = await page
      .getByRole(want.target.role, { name: nameOf(want.target.name ?? ''), exact: true })
      .count();
    if (n !== want.count)
      throw new Error(`count of ${describe(want.target)} is ${n}, expected ${want.count}`);
  } else if (want.value !== undefined && want.target) {
    const v = await locate(page, want.target).inputValue();
    if (v !== String(await fill(want.value, scope)))
      throw new Error(`${describe(want.target)} holds "${v}"`);
  }
}

/**
 * The consent banner covers the page bottom until answered. Answering would
 * write consent to the account (AnalyticsRoot syncs it) and break CONSENT-001,
 * so a step not about consent hides it before each action instead.
 */
async function hideConsentBanner(page) {
  const banner = page.getByRole('region', { name: 'Can we use analytics cookies?', exact: true });
  if (await banner.isVisible().catch(() => false)) {
    await banner
      .evaluate((n) => n.style.setProperty('visibility', 'hidden', 'important'))
      .catch(() => {});
  }
}

async function axe(page) {
  try {
    const { default: AxeBuilder } = await import('@axe-core/playwright');
    const res = await new AxeBuilder({ page }).analyze();
    return res.violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => `${v.id} (${v.nodes.length})`);
  } catch (e) {
    return [`axe could not run: ${e.message}`];
  }
}

export async function runUiStep(step, scope, env) {
  const { browser, accounts, frontendUrl, projectRef, outDir, fixtures, label } = env;
  if (!Array.isArray(step.actions) || !Array.isArray(step.expect)) {
    return { ok: false, blocked: true, detail: 'actions/expect still TODO(frontend)' };
  }
  const widths = [].concat(step.viewport ?? [390, 1440]);
  const viewer = step.viewer === 'each' ? scope.each : step.viewer;
  const notes = [];
  let ok = true;
  for (const width of widths) {
    // Slot names are times in the viewer's zone: pin the mentor's, so names are stable.
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      timezoneId: 'Europe/London',
      locale: 'en-GB',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    try {
      if (viewer && viewer !== 'anonymous') {
        await signIn(context, { accounts, ref: viewer, frontendUrl, projectRef });
      }
      await page.goto(`${frontendUrl}${await fill(step.route, scope)}`, {
        waitUntil: 'domcontentloaded',
      });
      // Let hydration finish: a click during it can be lost.
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
      for (const [i, action] of step.actions.entries()) {
        // Human pace: some controls commit their value a beat after the click
        // (a Select option), and a click inside that beat acts on the old answers.
        if (i > 0) await page.waitForTimeout(PACE);
        if (!step.consent) await hideConsentBanner(page);
        await act(page, action, scope, fixtures).catch((e) => {
          throw new Error(
            `action ${i + 1} ${action.do} ${action.target ? describe(action.target) : ''}: ${why(e)}`,
          );
        });
      }
      for (const want of step.expect) await expectOne(page, want, scope);
      if (step.a11y) {
        const found = await axe(page);
        if (found.length) {
          ok = false;
          notes.push(`${width}: axe ${found.join(', ')}`);
        }
      }
      if (errors.length) notes.push(`${width}: page errors: ${errors.slice(0, 2).join(' | ')}`);
    } catch (e) {
      ok = false;
      notes.push(`${width}: ${e.message.split('\n')[0]}`);
    } finally {
      if (step.screenshot !== false) {
        await page
          .screenshot({ path: join(outDir, `${label}-${width}.png`), fullPage: true })
          .catch(() => {});
      }
      await context.close();
    }
  }
  return { ok, detail: notes.join('; ') || 'ok' };
}
