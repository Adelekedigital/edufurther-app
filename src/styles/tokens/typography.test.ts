import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(__dirname, 'typography.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

function sizes(block: string): Record<string, number> {
  return Object.fromEntries(
    [...block.matchAll(/(--text-[\w-]+):\s*(\d+)px/g)].map(([, name, px]) => [name, Number(px)]),
  );
}

const phoneAt = css.indexOf('@media (max-width: 767px)');
const desktop = sizes(css.slice(0, phoneAt));
const phone = sizes(css.slice(phoneAt));

describe('phone type scale', () => {
  it('sits in a phone media query', () => {
    expect(phoneAt).toBeGreaterThan(-1);
  });

  it('steps down exactly the display and heading sizes the handoff lists', () => {
    expect(phone).toEqual({
      '--text-display-lg': 40,
      '--text-display-sm': 36,
      '--text-h1': 32,
      '--text-h2': 30,
      '--text-h3': 28,
      '--text-h4': 24,
      '--text-h5': 20,
      '--text-h6': 18,
    });
  });

  it('never makes a phone size larger than its desktop size', () => {
    for (const [name, px] of Object.entries(phone)) {
      expect(desktop[name], name).toBeDefined();
      expect(px, name).toBeLessThan(desktop[name] ?? 0);
    }
  });
});
