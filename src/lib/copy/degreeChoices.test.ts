import { describe, expect, it } from 'vitest';
import { degreeChoices } from './onboarding';

describe('degreeChoices', () => {
  it('offers Master’s and beyond: no Bachelor’s (owner 2026-11-21)', () => {
    expect(degreeChoices('').map((d) => d.label)).toEqual(['Master’s', 'MBA', 'PhD']);
    expect(degreeChoices('masters').map((d) => d.value)).not.toContain('bachelors');
  });

  it('a saved Bachelor’s still shows, so it reads as picked and can be changed', () => {
    expect(degreeChoices('bachelors').map((d) => d.value)).toEqual([
      'bachelors',
      'masters',
      'mba',
      'doctorate',
    ]);
  });
});
