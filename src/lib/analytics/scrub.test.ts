import { scrubProperties, scrubUrl } from './scrub';

const here = window.location.origin;

describe('scrub', () => {
  it('our own pages leave as their route template, never a handle, id or code', () => {
    expect(scrubUrl('/invite/AbC_12')).toBe('/invite/[code]');
    expect(scrubUrl('/mentors/olajuwon-samuel')).toBe('/mentors/[handle]');
    expect(scrubUrl('/explore')).toBe('/explore');
    expect(scrubUrl(`${here}/mentors/019ffbe6-8cfc?tab=reviews#x`)).toBe(
      `${here}/mentors/[handle]`,
    );
  });

  it('drops the query and fragment; another site leaves as its origin only', () => {
    expect(scrubUrl(`${here}/home?viewAs=ada@example.com#x`)).toBe(`${here}/home`);
    expect(scrubUrl('/login?next=/x')).toBe('/login');
    expect(scrubUrl('https://other.test/p/secret?token=t')).toBe('https://other.test');
    expect(scrubUrl('$direct')).toBe('$direct');
  });

  it('an unknown page or a protocol-relative path leaves as the /(other) bucket', () => {
    expect(scrubUrl('/not-a-page/123')).toBe('/(other)');
    expect(scrubUrl(`${here}/not-a-page/123?x=1`)).toBe(`${here}/(other)`);
    expect(scrubUrl('//evil.test/p')).toBe('/(other)');
  });

  it('our own referrer keeps its template', () => {
    expect(scrubProperties({ $referrer: `${here}/mentors/ada?y=1` })).toEqual({
      $referrer: `${here}/mentors/[handle]`,
    });
  });

  it('scrubs the SDK address properties, $set and $set_once, and nothing else', () => {
    const out = scrubProperties({
      $current_url: `${here}/invite/c?q=1`,
      $pathname: '/invite/c',
      $referrer: 'https://other.test/p?token=t',
      route: '/explore?x=1',
      $set: { $initial_current_url: `${here}/home?email=e` },
      $set_once: { $initial_pathname: '/invite/zz' },
    });
    expect(out).toEqual({
      $current_url: `${here}/invite/[code]`,
      $pathname: '/invite/[code]',
      $referrer: 'https://other.test',
      route: '/explore?x=1',
      $set: { $initial_current_url: `${here}/home` },
      $set_once: { $initial_pathname: '/invite/[code]' },
    });
  });
});
