#!/usr/bin/env node
/**
 * Layout invariants review-page can't see: "the heading overlaps the card" at a
 * width between the two we screenshot. Each check is a route, the widths to try,
 * a selector that means the page has rendered, and a function that returns an
 * error string (or null) from the live page.
 *
 *   node scripts/check-layout.mjs            # needs the app running
 *   REVIEW_BASE_URL=http://localhost:3300 node scripts/check-layout.mjs
 *
 * A check may list several routes (each run at every width). `run` returns
 * null (pass), an error string (fail), or { cannot } when the page it needs
 * isn't there: a missing element is "could not run", not a layout failure.
 * A check that must drive the page (open a modal, ask Chrome itself) gives
 * `drive(page)` instead of `run`, with the same return values.
 *
 * Exit codes (as review-page): 0 pass, 1 a layout check failed, 2 could not run.
 * A failing width is screenshotted into .review/ for the CI artifact.
 *
 * Add a check when a layout bug only showed up at an in-between width
 * (failure-modes.md), so it stays fixed.
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.REVIEW_BASE_URL || 'http://localhost:3000';
const OUT = '.review';

const CHECKS = [
  {
    // failure-modes #26: phone rules pulled the header 36px into the banner,
    // which only held while the name wrapped below the avatar (<470px).
    name: 'profile name clears the banner',
    slug: 'profile-name-banner',
    route: '/mentors/olajuwon-samuel',
    ready: '#profile-name',
    widths: [390, 600, 767, 768, 1024],
    run: () => {
      const name = document.getElementById('profile-name');
      // The banner is the header card's first child; found from the stable id,
      // not from a build-dependent CSS-module class name.
      const banner = name?.closest('section')?.firstElementChild;
      if (!name || !banner) return { cannot: 'header not found' };
      const overlap = banner.getBoundingClientRect().bottom - name.getBoundingClientRect().top;
      return overlap > 0.5 ? `name starts ${Math.round(overlap)}px inside the banner` : null;
    },
  },
  {
    // Product (design request #46): stacked, the topics come before the
    // buttons; from 768px they sit on their own line under the row, as drawn.
    name: 'profile topics vs buttons order',
    slug: 'profile-topics-order',
    route: '/mentors/olajuwon-samuel',
    ready: '#profile-name',
    widths: [390, 600, 767, 768, 1024, 1440],
    run: () => {
      const head = document.getElementById('profile-name')?.closest('section');
      // The topics row: the chip list is display: contents inside it, so the
      // owner's "Edit topics" wraps with the chips (the list has no box).
      const topics = head?.querySelector('ul[aria-label="Helps with"]')?.parentElement;
      // The actions row, found by the Share button: Book's label changes when
      // booking is blocked ("Can't book right now"), Share's never does.
      const actions = head?.querySelector('button[aria-label="Share profile"]')?.parentElement
        ?.parentElement;
      if (!topics || !actions) return { cannot: 'topics or the actions row not found' };
      const t = topics.getBoundingClientRect();
      const b = actions.getBoundingClientRect();
      if (window.innerWidth < 768)
        return t.bottom <= b.top ? null : 'topics are not above the buttons';
      return t.top >= b.bottom ? null : 'topics are not below the buttons';
    },
  },
  {
    // Design request #47: from 768px the photo sits 10px into the banner,
    // however many lines the intro beside it runs to. fatima-okafor is a sparse
    // mock profile with no headline (the short-intro case).
    name: 'profile photo 10px into the banner',
    slug: 'profile-photo-banner',
    route: ['/mentors/olajuwon-samuel', '/mentors/fatima-okafor'],
    ready: '#profile-name',
    widths: [768, 900, 1024, 1440],
    run: () => {
      const head = document.getElementById('profile-name')?.closest('section');
      const banner = head?.firstElementChild;
      // The photo circle: the parent of the photo (img with the mentor's name)
      // or of the initials (role="img"), which are centred text inside it.
      const photo = head?.querySelector('img:not([alt=""]), [role="img"]')?.parentElement;
      if (!banner || !photo) return { cannot: 'header photo not found' };
      const into = banner.getBoundingClientRect().bottom - photo.getBoundingClientRect().top;
      return Math.abs(into - 10) <= 0.5 ? null : `photo is ${Math.round(into)}px into the banner`;
    },
  },
  {
    // Design reply #45: a new mentor's first-mentees card sits at the top of
    // the aside from 768px, and under the tabs (above the tab panel) on phones.
    name: 'first-mentees card placement',
    slug: 'first-mentees-placement',
    route: '/mentors/adaeze-okonkwo',
    ready: '[data-first-mentees]',
    widths: [390, 767, 768, 1440],
    run: () => {
      const card = document.querySelector('[data-first-mentees]');
      if (!card) return { cannot: 'first-mentees card not found' };
      if (window.innerWidth >= 768) {
        const aside = card.closest('aside');
        return aside && aside.firstElementChild === card ? null : 'card is not first in the aside';
      }
      const tabs = document.querySelector('[role=tablist]');
      const panel = document.querySelector('[role=tabpanel]');
      if (!tabs || !panel) return { cannot: 'tabs or panel not found' };
      const c = card.getBoundingClientRect();
      return tabs.getBoundingClientRect().bottom <= c.top &&
        c.bottom <= panel.getBoundingClientRect().top
        ? null
        : 'card is not between the tabs and the tab panel';
    },
  },
  {
    // Product (2026-09-30, PR 123): a session type's facts (length, questions,
    // topics: two then "+N", ellipsed if still long) stay on one line inside
    // the row, so every row keeps one height.
    name: 'session type facts on one line',
    slug: 'session-type-facts',
    route: '/session-types',
    ready: 'article ul',
    widths: [390, 600, 767, 768, 1024],
    run: () => {
      const rows = [...document.querySelectorAll('article')];
      if (!rows.length) return { cannot: 'no session type rows' };
      for (const row of rows) {
        const facts = row.querySelector('ul');
        if (!facts) continue;
        const items = [...facts.children].map((li) => li.getBoundingClientRect());
        if (items.some((r) => Math.abs(r.top - items[0].top) > 1))
          return `facts wrap in "${row.querySelector('h2')?.textContent}"`;
        if (facts.getBoundingClientRect().right > row.getBoundingClientRect().right + 0.5)
          return `facts spill out of "${row.querySelector('h2')?.textContent}"`;
      }
      return null;
    },
  },
  {
    // Codex review of #104: Chrome read the sr-only span as a separate block
    // ("Lagos (WAT) , change time zone"). jsdom can't see that, so ask
    // Chrome's own accessibility tree for the name it gives screen readers.
    name: 'time-zone button name in Chrome',
    slug: 'timezone-button-name',
    route: '/explore',
    ready: 'article button',
    widths: [1440],
    timezoneId: 'Africa/Lagos',
    drive: async (page) => {
      const book = page.getByRole('button', { name: /^(Book session with|See availability)/ });
      if ((await book.count()) === 0) return { cannot: 'no Book button on Explore' };
      await book.first().click();
      // Found by its text, not its markup, so an implementation change that
      // breaks the name fails here rather than "could not run".
      const trigger = page.getByRole('dialog').locator('button', { hasText: 'Lagos (WAT)' });
      if (
        !(await trigger.waitFor({ timeout: 15000 }).then(
          () => true,
          () => false,
        ))
      )
        return { cannot: 'time-zone button not found in the booking modal' };
      const cdp = await page.context().newCDPSession(page);
      const { nodes } = await cdp.send('Accessibility.getFullAXTree');
      const names = nodes
        .filter((n) => n.role?.value === 'button' && /time zone/.test(n.name?.value ?? ''))
        .map((n) => n.name.value);
      const want = 'Lagos (WAT), change time zone';
      return names.includes(want)
        ? null
        : `Chrome names it ${JSON.stringify(names)}, want "${want}"`;
    },
  },
];

function cannotRun(msg) {
  process.stderr.write(`check-layout: ${msg}\n`);
  process.exit(2);
}

const browser = await chromium.launch().catch((e) => cannotRun(`no browser: ${e.message}`));
let failed = 0;
for (const check of CHECKS) {
  for (const route of [check.route].flat()) {
    for (const width of check.widths) {
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        timezoneId: check.timezoneId,
      });
      try {
        await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
      } catch (e) {
        await browser.close();
        cannotRun(`could not load ${BASE}${route}: ${e.message.split('\n')[0]}`);
      }
      // The profile fetches in the browser; networkidle can land on the skeleton.
      await page.waitForSelector(check.ready, { timeout: 15000 }).catch(() => {});
      const result = check.drive ? await check.drive(page) : await page.evaluate(check.run);
      if (result && typeof result === 'object') {
        await browser.close();
        cannotRun(`${check.name} at ${width}px on ${route}: ${result.cannot}`);
      }
      const error = result;
      if (error) {
        failed++;
        mkdirSync(OUT, { recursive: true });
        const page_ = route.split('/').filter(Boolean).join('-');
        await page.screenshot({
          path: `${OUT}/layout-${check.slug}-${page_}-${width}.png`,
          fullPage: true,
        });
      }
      console.log(
        `${error ? 'FAIL' : 'PASS'}  ${width}px  ${check.name}  ${route}${error ? ` — ${error}` : ''}`,
      );
      await page.close();
    }
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
