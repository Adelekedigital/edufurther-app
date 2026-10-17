import { describe, expect, it } from 'vitest';
import { missingLine, NOT_SURE } from '@/lib/copy/onboarding';
import { EMPTY_PLANS, fieldOk, missingHelp, missingPlans } from './onboardingAnswers';

describe('missingPlans', () => {
  it('names every gap, in the design’s order', () => {
    expect(missingLine(missingPlans(EMPTY_PLANS))).toBe(
      'To continue, add where you’re from, what you’re applying for, what you want to study, where you want to study.',
    );
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
    expect(missingLine(missingHelp([]))).toBe('To continue, add at least one area.');
    expect(missingHelp(['a'])).toEqual([]);
  });
});
