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
      if (!name || !banner) return 'header not found';
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
      const topics = head?.querySelector('ul[aria-label="Helps with"]');
      const book = [...(head?.querySelectorAll('button') ?? [])].find((b) => /Book/.test(b.textContent));
      if (!topics || !book) return 'topics or Book not found';
      const t = topics.getBoundingClientRect();
      const b = book.getBoundingClientRect();
      if (window.innerWidth < 768) return t.bottom <= b.top ? null : 'topics are not above the buttons';
      return t.top >= b.bottom ? null : 'topics are not below the buttons';
    },
  },
  {
    // Design request #47: from 768px the photo sits 10px into the banner,
    // however many lines the intro beside it runs to.
    name: 'profile photo 10px into the banner',
    slug: 'profile-photo-banner',
    route: '/mentors/olajuwon-samuel',
    ready: '#profile-name',
    widths: [768, 900, 1024, 1440],
    run: () => {
      const head = document.getElementById('profile-name')?.closest('section');
      const banner = head?.firstElementChild;
      const photo = head?.children[1]?.firstElementChild;
      if (!banner || !photo) return 'header not found';
      const into = banner.getBoundingClientRect().bottom - photo.getBoundingClientRect().top;
      return Math.abs(into - 10) <= 0.5 ? null : `photo is ${Math.round(into)}px into the banner`;
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
  for (const width of check.widths) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    try {
      await page.goto(`${BASE}${check.route}`, { waitUntil: 'networkidle' });
    } catch (e) {
      await browser.close();
      cannotRun(`could not load ${BASE}${check.route}: ${e.message.split('\n')[0]}`);
    }
    // The profile fetches in the browser; networkidle can land on the skeleton.
    await page.waitForSelector(check.ready, { timeout: 15000 }).catch(() => {});
    const error = await page.evaluate(check.run);
    if (error) {
      failed++;
      mkdirSync(OUT, { recursive: true });
      await page.screenshot({ path: `${OUT}/layout-${check.slug}-${width}.png`, fullPage: true });
    }
    console.log(`${error ? 'FAIL' : 'PASS'}  ${width}px  ${check.name}${error ? ` — ${error}` : ''}`);
    await page.close();
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
