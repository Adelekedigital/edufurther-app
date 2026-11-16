import { mentorProfilePath } from './mentorPath';

describe('mentorProfilePath', () => {
  it('uses the slug, else the handle, else the id', () => {
    expect(mentorProfilePath({ slug: 'ada-l', handle: 'old', id: 'u-1' })).toBe('/mentors/ada-l');
    expect(mentorProfilePath({ slug: null, handle: 'ada-l', id: 'u-1' })).toBe('/mentors/ada-l');
    expect(mentorProfilePath({ slug: '', handle: null, id: 'u-1' })).toBe('/mentors/u-1');
    expect(mentorProfilePath({ id: 'u-1' })).toBe('/mentors/u-1');
  });

  it('encodes the handle as one path segment', () => {
    expect(mentorProfilePath({ id: 'a/b c' })).toBe('/mentors/a%2Fb%20c');
  });

  it('adds the query, encoded, leaving out undefined values', () => {
    expect(
      mentorProfilePath({ id: 'u-1' }, { book: 't-1', at: '2026-11-20T10:00:00Z', tab: undefined }),
    ).toBe('/mentors/u-1?book=t-1&at=2026-11-20T10%3A00%3A00Z');
    expect(mentorProfilePath({ id: 'u-1' }, { tab: undefined })).toBe('/mentors/u-1');
    expect(mentorProfilePath({ id: 'u-1' }, {})).toBe('/mentors/u-1');
  });
});
