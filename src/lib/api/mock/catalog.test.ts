import { countryIdByName } from './catalog';
import { FEATURED, MENTORS, mockCountries } from './fixtures';

describe('mock catalog', () => {
  it('every fixture country has a catalog id, so the editor can prefill it', () => {
    for (const m of [FEATURED, ...MENTORS]) {
      const c = mockCountries(m.id);
      for (const name of [c.origin_country, c.primary_study_country])
        if (name) expect(countryIdByName(name), name).not.toBeNull();
    }
  });
});
