import { describe, expect, it } from 'vitest';
import { nudgeParts } from './viewer';

describe('nudgeParts', () => {
  it('groups /me onboarding.missing into the nudge’s two parts', () => {
    expect(nudgeParts(['help'])).toEqual(['help']);
    expect(nudgeParts(['origin', 'field'])).toEqual(['plans']);
    expect(nudgeParts(['help', 'degree'])).toEqual(['help', 'plans']);
    expect(nudgeParts([])).toEqual([]);
    expect(nudgeParts(undefined)).toEqual([]);
  });
});
