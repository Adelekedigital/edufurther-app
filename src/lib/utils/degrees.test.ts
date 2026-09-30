import { degreeFromSaved, levelCodeFor, yearToDate } from './degrees';

describe('degrees', () => {
  it('each offered degree maps to its catalog level; Other to none', () => {
    expect(levelCodeFor('PhD')).toBe('phd');
    expect(levelCodeFor('MEng')).toBe('masters');
    expect(levelCodeFor('MBA')).toBe('mba');
    expect(levelCodeFor('BA')).toBe('undergraduate');
    expect(levelCodeFor('Other')).toBeNull();
    expect(levelCodeFor('LLM')).toBeUndefined();
  });

  it('a saved abbreviation is kept as is; none reads as Other', () => {
    expect(degreeFromSaved('LLM')).toBe('LLM');
    expect(degreeFromSaved(null)).toBe('Other');
  });

  it('a year becomes Jan 1; a saved date keeps its month and day while its year stands', () => {
    expect(yearToDate(2024, null)).toBe('2024-01-01');
    expect(yearToDate(2023, '2023-08-15')).toBe('2023-08-15');
    expect(yearToDate(2024, '2023-08-15')).toBe('2024-01-01');
  });
});
