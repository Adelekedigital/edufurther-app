// Headless screen test for PR 112: the compact review session picker. One PNG per step.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
for (const w of [1440, 390]) {
  const p = await b.newPage({ viewport: { width: w, height: w > 500 ? 900 : 844 }, deviceScaleFactor: 1 });
  const frames = [];
  const shot = async (caption) => {
    await p.waitForTimeout(350);
    const file = `${OUT}/f-${w}-${String(frames.length).padStart(2, '0')}.png`;
    await p.screenshot({ path: file });
    frames.push({ file, caption });
  };
  await p.goto('http://localhost:3300/mentors/olajuwon-samuel?tab=reviews', { waitUntil: 'networkidle' });
  await shot('Mentee on a mentor they had 5 sessions with');
  await p.getByRole('button', { name: 'Write a review' }).first().click();
  await p.waitForSelector('[role="dialog"]');
  await shot('Review opens: the newest session on one line, with "Change"');
  await p.getByRole('button', { name: /^Change session/ }).click();
  await shot('"Change" opens the rows; focus on the current pick');
  await p.keyboard.press('ArrowDown');
  await shot('Arrow down moves the pick (the list stays open)');
  await p.keyboard.press('Enter');
  await shot('Enter confirms: folded back to one line, focus on "Change"');
  await p.getByRole('button', { name: /^Change session/ }).click();
  await p.getByRole('dialog').getByRole('button', { name: /Show \d+ more/ }).click();
  await shot('"Show 2 more" reveals the rest');
  await p.getByRole('dialog').getByRole('radio').filter({ hasText: /Aug|Sep/ }).last().click();
  await shot('Picking the oldest folds it back');
  await p.getByRole('textbox').first().fill('A draft that must survive Escape.');
  await p.getByRole('button', { name: /^Change session/ }).click();
  await p.keyboard.press('ArrowUp');
  await shot('Open again and move the pick…');
  await p.keyboard.press('Escape');
  await shot('Escape: folded, earlier pick kept, draft still there');
  writeFileSync(`${OUT}/frames-${w}.json`, JSON.stringify(frames));
  await p.close();
}
await b.close();
console.log('ok');
