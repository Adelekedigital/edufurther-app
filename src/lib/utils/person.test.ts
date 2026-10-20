import { coverFor } from './cover';
import { clampFocus, focusVars, personCover, personInitials } from './person';

describe('personInitials', () => {
  it('first and last: two letters, upper case', () => {
    expect(personInitials('grace', 'eze')).toBe('GE');
  });
  it('one name: its first letter', () => {
    expect(personInitials('Grace', '')).toBe('G');
    expect(personInitials(null, 'Eze')).toBe('E');
  });
  it('no name: the fallback’s first letter, else empty', () => {
    expect(personInitials('', ' ', 'ada@example.com')).toBe('A');
    expect(personInitials(undefined, undefined)).toBe('');
  });
});

describe('clampFocus and focusVars', () => {
  it('clamps to 0–1 and drops malformed points', () => {
    expect(clampFocus({ x: -1, y: 2 })).toEqual({ x: 0, y: 1 });
    expect(clampFocus({ x: Number.NaN, y: 0.5 })).toBeNull();
    expect(clampFocus(null)).toBeNull();
  });
  it('turns a point into the crop variables', () => {
    expect(focusVars({ x: 0.5, y: 0.25 })).toEqual({
      '--avatar-x': '50.0%',
      '--avatar-y': '25.0%',
    });
    expect(focusVars(null)).toEqual({});
  });
});

describe('personCover', () => {
  it('the chosen cover, else the id’s', () => {
    expect(personCover('u1', 'sky')).toBe('sky');
    expect(personCover('u1', null)).toBe(coverFor('u1'));
  });
});
