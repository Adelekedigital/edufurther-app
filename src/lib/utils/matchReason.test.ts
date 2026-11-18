import { describe, expect, it } from 'vitest';
import { countryInSentence } from './format';
import { joinAnd, reasonLine } from './matchReason';

const uk = { id: 'gb', label: 'United Kingdom' };
const gh = { id: 'gh', label: 'Ghana' };
const none = { level: null, studyCountry: null };

describe('countryInSentence', () => {
  it('names the three countries that take "the"', () => {
    expect(countryInSentence('United Kingdom')).toBe('the United Kingdom');
    expect(countryInSentence('United States')).toBe('the United States');
    expect(countryInSentence('Netherlands')).toBe('the Netherlands');
    expect(countryInSentence('Canada')).toBe('Canada');
  });
});

describe('joinAnd', () => {
  it('joins with commas and a final "and"', () => {
    expect(joinAnd(['a'])).toBe('a');
    expect(joinAnd(['a', 'b'])).toBe('a and b');
    expect(joinAnd(['a', 'b', 'c'])).toBe('a, b and c');
  });
});

describe('reasonLine', () => {
  it('leads with the first reason and joins the rest with " · "', () => {
    const line = reasonLine(
      [
        { code: 'study_country', country: uk },
        { code: 'degree', level: 'Master’s' },
        { code: 'help_areas', slugs: ['school-selection', 'document-preparation'] },
        { code: 'field', field: 'Computer Science' },
        { code: 'origin', country: gh },
      ],
      none,
    );
    expect(line).toEqual({
      lead: 'Studied in the United Kingdom',
      // Help areas follow the cards' order, not the server's.
      rest: ' · Master’s · Helps with your documents and choosing a school · Computer Science · Also from Ghana',
      matched: true,
    });
  });

  it('has no rest when there is one reason', () => {
    expect(reasonLine([{ code: 'origin', country: gh }], none)).toEqual({
      lead: 'Also from Ghana',
      rest: '',
      matched: true,
    });
  });

  it('is null when nothing is left to say', () => {
    expect(reasonLine([{ code: 'help_areas', slugs: ['unknown'] }], none)).toBeNull();
  });

  it('falls back to "{level} · {country}" with no reason', () => {
    expect(reasonLine([], { level: 'PhD', studyCountry: 'United States' })).toEqual({
      lead: 'PhD · the United States',
      rest: '',
      matched: false,
    });
  });
});
