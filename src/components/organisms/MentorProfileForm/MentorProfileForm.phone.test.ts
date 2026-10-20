import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const form = strip(readFileSync(join(__dirname, 'MentorProfileForm.module.css'), 'utf8'));
const panel = strip(
  readFileSync(
    join(__dirname, '../../../app/(app)/settings/_components/MentorProfilePanel.module.css'),
    'utf8',
  ),
);

/** The rules inside every `@media (max-width: 767px)` block, joined. */
const phone = (css: string) =>
  [...css.matchAll(/@media \(max-width: 767px\)\s*\{([\s\S]*?\n)\}/g)].map((m) => m[1]).join('\n');

// jsdom applies no CSS modules, so the owner's decision is pinned in the CSS itself.
describe('“How mentees see you” on phones (owner, 2026-10-20)', () => {
  it('the preview column is hidden under 768px', () => {
    expect(phone(form)).toMatch(/\.aside\s*\{\s*display:\s*none;\s*\}/);
  });

  it('and so is its loading skeleton, so nothing appears that never arrives', () => {
    expect(phone(panel)).toMatch(/\.skeletonAside\s*\{\s*display:\s*none;\s*\}/);
  });
});
