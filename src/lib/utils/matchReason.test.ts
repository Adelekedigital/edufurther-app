import { describe, expect, it } from 'vitest';
import { basedOnLine, countryInSentence, joinAnd, reasonLine } from './matchReason';

const uk = { id: 'gb', label: 'United Kingdom' };
const gh = { id: 'gh', label: 'Ghana' };
const none = { level: null, studyCountry: null };

describe('countryInSentence', () => {
  it('names the three countries that take "the"', () => {
    expect(countryInSentence('United Kingdom')).toBe('the UK');
    expect(countryInSentence('United States')).toBe('the US');
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
      lead: 'Studied in the UK',
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

  it('skips help areas it has no copy for', () => {
    expect(reasonLine([{ code: 'help_areas', slugs: ['unknown'] }], none).matched).toBe(false);
  });

  it('falls back to "{level} · {country}" with no reason', () => {
    expect(reasonLine([], { level: 'PhD', studyCountry: 'United States' })).toEqual({
      lead: 'PhD · the US',
      rest: '',
      matched: false,
    });
  });
});

describe('basedOnLine', () => {
  it('reads as the design draws it', () => {
    expect(
      basedOnLine({ degree: 'MBA', field: 'Law', country: 'United Kingdom', origin: 'Nigeria' }),
    ).toBe('Based on: MBA Law in the UK · from Nigeria');
  });

  it('leaves out "Not sure yet"', () => {
    expect(basedOnLine({ degree: 'PhD', field: 'Law', country: null, origin: null })).toBe(
      'Based on: PhD Law',
    );
  });

  it('is null with nothing to say', () => {
    expect(basedOnLine({ degree: null, field: null, country: null, origin: null })).toBeNull();
  });
});
