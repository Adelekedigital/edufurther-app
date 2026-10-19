import { educationMeta, educationTitle, educationWhere, type EducationRow } from './educationLine';

const row = (over: Partial<EducationRow> = {}): EducationRow => ({
  id: 'e1',
  degree: 'BSc',
  course: 'Microbiology',
  school: 'University of Lagos',
  start: '2018',
  end: '2022',
  ...over,
});

describe('educationLine', () => {
  it('the design’s title, meta and the delete line', () => {
    expect(educationTitle(row())).toBe('BSc, Microbiology');
    expect(educationMeta(row())).toBe('University of Lagos · 2018 – 2022');
    expect(educationWhere(row())).toBe('University of Lagos, 2022');
  });

  it('leaves out what isn’t saved, with no stray separators', () => {
    expect(educationTitle(row({ course: '' }))).toBe('BSc');
    expect(educationTitle(row({ degree: null }))).toBe('Microbiology');
    expect(educationMeta(row({ end: null }))).toBe('University of Lagos · 2018');
    expect(educationMeta(row({ start: null, end: null }))).toBe('University of Lagos');
    expect(educationWhere(row({ end: null }))).toBe('University of Lagos');
  });
});
