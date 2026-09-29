import { COVER_KEYS, coverArt, coverFor, coverKey, coverVars, topicIcon } from './cover';

/** The design's formula, verbatim (Mentor Profile.dc.html). */
function designPick(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COVER_KEYS[h % COVER_KEYS.length];
}

describe('coverFor', () => {
  it('matches the design’s hash for any id', () => {
    for (const id of ['m-adaeze', 'm-olajuwon', '019ffbe6-8cfc-759b-aaf9-bb480b8c29ad', '', 'x']) {
      expect(coverFor(id)).toBe(designPick(id));
    }
  });
  it('is stable and spreads across the palette', () => {
    expect(coverFor('m-adaeze')).toBe(coverFor('m-adaeze'));
    const seen = new Set(Array.from({ length: 200 }, (_, i) => coverFor(`mentor-${i}`)));
    expect(seen.size).toBe(COVER_KEYS.length);
  });
  it('maps to the cover tokens', () => {
    expect(coverVars('lilac')).toEqual({
      bg: 'var(--cover-lilac-bg)',
      ink: 'var(--cover-lilac-ink)',
    });
  });
});

describe('coverKey / coverArt', () => {
  it('keeps only our keys, so nothing unknown reaches CSS', () => {
    expect(coverKey('mint')).toBe('mint');
    expect(coverKey('red); background: url(x)')).toBeNull();
    expect(coverKey(null)).toBeNull();
    expect(coverKey(3)).toBeNull();
  });
  it('reads unknown art as none', () => {
    expect(coverArt('pattern')).toBe('pattern');
    expect(coverArt('sparkles')).toBe('none');
    expect(coverArt(undefined)).toBe('none');
  });
});

describe('topicIcon', () => {
  it('matches the design’s topic icons on the label’s words', () => {
    expect(topicIcon('Visa interview prep')).toBe('flight_takeoff');
    expect(topicIcon('Scholarships & funding')).toBe('payments');
    expect(topicIcon('Statement of purpose')).toBe('edit_document');
    expect(topicIcon('Resume review')).toBe('description');
    expect(topicIcon('Application documents')).toBe('folder_open');
    expect(topicIcon('Career after graduation')).toBe('work');
    expect(topicIcon('Choosing a university')).toBe('school');
    expect(topicIcon('Something new')).toBe('label');
  });
});
