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
});
