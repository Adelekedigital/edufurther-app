import { norm, rankByMatch, safeDecode } from './text';

it('norm ignores case and accents', () => {
  expect(norm('Côte d’Ivoire')).toBe('cote d’ivoire');
});

describe('rankByMatch', () => {
  const countries = [
    'Argentina',
    'Benin',
    'Côte d’Ivoire',
    'Ghana',
    'Niger',
    'Nigeria',
    'South Africa',
  ];
  const rank = (term: string) => rankByMatch(countries, term, (c) => c);

  it('puts names that start with the term first, keeping the list order within a tier', () => {
    expect(rank('n')).toEqual(['Niger', 'Nigeria', 'Argentina', 'Benin', 'Ghana']);
  });
  it('then names with a word that starts with it, then any other match', () => {
    expect(rank('a')).toEqual(['Argentina', 'South Africa', 'Ghana', 'Nigeria']);
    expect(rank('i')).toEqual([
      'Côte d’Ivoire',
      'Argentina',
      'Benin',
      'Niger',
      'Nigeria',
      'South Africa',
    ]);
  });
  it('ignores case, accents and surrounding spaces, and drops non-matches', () => {
    expect(rank('  COTE ')).toEqual(['Côte d’Ivoire']);
    expect(rank('zz')).toEqual([]);
  });
  it('an empty term keeps every item in order', () => {
    expect(rank(' ')).toEqual(countries);
  });
  it('fallback-only matches come last', () => {
    const vals = [
      { name: 'sessionDate', meaning: 'When the session is' },
      { name: 'mentorName', meaning: 'The mentor’s session name' },
      { name: 'menteeName', meaning: 'Who booked' },
    ];
    const names = (t: string) =>
      rankByMatch(
        vals,
        t,
        (v) => v.name,
        (v) => v.meaning,
      ).map((v) => v.name);
    expect(names('session')).toEqual(['sessionDate', 'mentorName']);
    expect(names('name')).toEqual(['mentorName', 'menteeName']);
  });
});

describe('safeDecode', () => {
  it('decodes a good %-sequence', () => {
    expect(safeDecode('ada%20okafor')).toBe('ada okafor');
  });
  it('is null for a malformed one, never a throw', () => {
    expect(safeDecode('%E0')).toBeNull();
  });
});
