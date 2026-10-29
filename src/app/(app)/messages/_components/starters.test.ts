import { startersFor, type MenteeStarterData } from './starters';

const data = (over: Partial<MenteeStarterData> = {}): MenteeStarterData => ({
  myFirst: 'Amara',
  degree: 'mba',
  field: 'Finance',
  term: null,
  firstNeed: { code: 'scholarships-financial-aid', name: 'Scholarships & financial aid' },
  ...over,
});

describe('startersFor (PRD "Starters")', () => {
  it('mentee: filled from the goal, the first help area and the mentor’s school', () => {
    const s = startersFor('mentee', 'Hugh', { mentee: data(), theirInstitution: 'LSE' });
    expect(s.map((x) => x.text)).toEqual([
      'Hi Hugh, I’m Amara. I’m applying for an MBA in Finance. Looking forward to our session!',
      'Hi Hugh, in our session I’d love to focus on finding scholarships.',
      'Hi Hugh, is there anything I should prepare or send before our session?',
      'Hi Hugh, what was applying to LSE like for you?',
    ]);
  });

  it('the topic is in the mentee’s own words, for every help area', () => {
    const cover = (code: string, name = 'Area') =>
      startersFor('mentee', 'Hugh', {
        mentee: data({ firstNeed: { code, name } }),
        theirInstitution: null,
      }).find((x) => x.key === 'cover')?.text;
    expect(cover('document-preparation')).toBe(
      'Hi Hugh, in our session I’d love to focus on my application documents.',
    );
    expect(cover('interview-preparation')).toBe(
      'Hi Hugh, in our session I’d love to focus on preparing for my interviews.',
    );
  });

  it('an area with no phrase yet still shows, in its catalog name (owner, 2026-10-28)', () => {
    const cover = (name: string) =>
      startersFor('mentee', 'Hugh', {
        mentee: data({ firstNeed: { code: 'visa-guidance', name } }),
        theirInstitution: null,
      }).find((x) => x.key === 'cover')?.text;
    expect(cover('Visa guidance')).toBe(
      'Hi Hugh, in our session I’d love to focus on visa guidance.',
    );
    expect(cover('GRE prep')).toBe('Hi Hugh, in our session I’d love to focus on GRE prep.');
    expect(cover('  ')).toBeUndefined();
  });

  it('a chip whose data is missing is hidden; Ask what to prepare always shows', () => {
    const s = startersFor('mentee', 'Hugh', {
      mentee: data({ degree: '', firstNeed: null }),
      theirInstitution: null,
    });
    expect(s.map((x) => x.label)).toEqual(['Ask what to prepare']);
    expect(
      startersFor('mentee', 'Hugh', { mentee: data({ field: ' ' }), theirInstitution: null }).map(
        (x) => x.key,
      ),
    ).not.toContain('intro');
  });

  it('mentor: the three that need no data', () => {
    expect(
      startersFor('mentor', 'Gia', { mentee: null, theirInstitution: 'X' }).map((x) => x.label),
    ).toEqual(['Welcome them', 'Ask for documents', 'Share how to prepare']);
  });
});
