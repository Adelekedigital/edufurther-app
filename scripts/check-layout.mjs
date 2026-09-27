#!/usr/bin/env node
/**
 * Layout invariants review-page can't see: "the heading overlaps the card" at a
 * width between the two we screenshot. Each check is a route, the widths to try,
 * and a function that returns an error string (or null) from the live page.
 *
 *   node scripts/check-layout.mjs            # needs the app running
 *   REVIEW_BASE_URL=http://localhost:3300 node scripts/check-layout.mjs
 *
 * Add a check when a layout bug only showed up at an in-between width
 * (failure-modes.md), so it stays fixed.
 */
import { chromium } from 'playwright';

const BASE = process.env.REVIEW_BASE_URL || 'http://localhost:3000';

const CHECKS = [
  {
    // failure-modes #26: phone rules pulled the header 36px into the banner,
    // which only held while the name wrapped below the avatar (<470px).
    name: 'profile name clears the banner',
    route: '/mentors/olajuwon-samuel',
    widths: [390, 600, 767, 768, 1024],
    run: () => {
      const banner = document.querySelector('[class*=ProfileHeader-module][class*=banner]');
      const name = document.getElementById('profile-name');
      if (!banner || !name) return 'header not found';
      const overlap = banner.getBoundingClientRect().bottom - name.getBoundingClientRect().top;
      return overlap > 0.5 ? `name starts ${Math.round(overlap)}px inside the banner` : null;
    },
  },
];

const browser = await chromium.launch();
let failed = 0;
for (const check of CHECKS) {
  for (const width of check.widths) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(`${BASE}${check.route}`, { waitUntil: 'networkidle' });
    const error = await page.evaluate(check.run);
    if (error) failed++;
    console.log(`${error ? 'FAIL' : 'PASS'}  ${width}px  ${check.name}${error ? ` — ${error}` : ''}`);
    await page.close();
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
