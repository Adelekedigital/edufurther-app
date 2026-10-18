import { describe, expect, it } from 'vitest';
import { NOT_SURE } from '@/lib/copy/onboarding';
import { EMPTY_PLANS, fieldOk, missingHelp, missingPlans } from './onboardingAnswers';

describe('missingPlans', () => {
  it('names every gap, in the design’s order', () => {
    // First is where focus goes when Continue is pressed.
    expect(missingPlans(EMPTY_PLANS)).toEqual(['origin', 'degree', 'field', 'destination']);
  });

  it('accepts "Not sure yet" as an answer', () => {
    expect(
      missingPlans({ originId: 'ng', degree: 'mba', field: 'Law', destinationId: NOT_SURE }),
    ).toEqual([]);
  });

  it('wants 2–100 characters of field, trimmed', () => {
    expect(fieldOk(' L ')).toBe(false);
    expect(fieldOk('Law')).toBe(true);
    expect(fieldOk('x'.repeat(101))).toBe(false);
  });
});

describe('missingHelp', () => {
  it('wants at least one area', () => {
    expect(missingHelp([])).toEqual(['help']);
    expect(missingHelp(['a'])).toEqual([]);
  });
});
