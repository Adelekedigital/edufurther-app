import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(__dirname, 'AppShell.module.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

/** The declarations of the top-level `.rail { … }` block. */
const rail = css.match(/(?:^|\n)\.rail\s*\{([^}]*)\}/)?.[1] ?? '';

describe('the rail’s stacking layer (failure log: popover trapped in a sticky container)', () => {
  it('is sticky with a z-index above in-page popovers (30) and below "Your credits" (40)', () => {
    expect(rail).toMatch(/position:\s*sticky/);
    const z = Number(rail.match(/z-index:\s*(\d+)/)?.[1]);
    expect(z).toBeGreaterThan(30);
    expect(z).toBeLessThan(40);
  });
});
