import { COVER_KEYS, coverFor, coverVars } from './cover';

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
