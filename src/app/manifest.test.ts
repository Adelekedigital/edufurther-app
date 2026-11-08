import { describe, expect, it } from 'vitest';
import manifest from './manifest';

describe('manifest', () => {
  it('opens the installed app on `/`, which sends each role to its own home', () => {
    // Not /explore: a mentor would land on Explore instead of the dashboard.
    expect(manifest().start_url).toBe('/');
  });

  it('keeps every role home inside the app scope', () => {
    const { scope } = manifest();
    // Unset defaults to the start_url's directory, `/`.
    expect(scope === undefined || scope === '/').toBe(true);
  });

  it('still installs as a standalone app', () => {
    expect(manifest().display).toBe('standalone');
  });

  it('the brand icon (owner, 2026-11-07): 192 and 512, the 512 also maskable', () => {
    const icons = manifest().icons ?? [];
    expect(icons).toContainEqual(
      expect.objectContaining({ src: '/pwa-icon/192', sizes: '192x192', purpose: 'any' }),
    );
    expect(icons).toContainEqual(
      expect.objectContaining({ src: '/pwa-icon/512', sizes: '512x512', purpose: 'any' }),
    );
    expect(icons).toContainEqual(
      expect.objectContaining({ src: '/pwa-icon/512', sizes: '512x512', purpose: 'maskable' }),
    );
  });
});
