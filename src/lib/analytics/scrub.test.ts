import { routeOf, scrubProperties, scrubUrl } from './scrub';

describe('scrub', () => {
  it('hides an invite code in the route', () => {
    expect(routeOf('/invite/AbC_12')).toBe('/invite/[code]');
    expect(routeOf('/invite/AbC_12/more')).toBe('/invite/[code]/more');
    expect(routeOf('/explore')).toBe('/explore');
  });

  it('drops the query and fragment of a URL or path', () => {
    expect(scrubUrl('https://app.edufurther.org/home?viewAs=ada@example.com#x')).toBe(
      'https://app.edufurther.org/home',
    );
    expect(scrubUrl('https://app.edufurther.org/invite/secret?utm_source=x')).toBe(
      'https://app.edufurther.org/invite/[code]',
    );
    expect(scrubUrl('/login?next=/x')).toBe('/login');
    expect(scrubUrl('$direct')).toBe('$direct');
  });

  it('scrubs the SDK address properties, $set and $set_once, and nothing else', () => {
    const out = scrubProperties({
      $current_url: 'https://a.test/invite/c?q=1',
      $pathname: '/invite/c',
      $referrer: 'https://other.test/p?token=t',
      route: '/explore?x=1',
      $set: { $initial_current_url: 'https://a.test/x?email=e' },
      $set_once: { $initial_pathname: '/invite/zz' },
    });
    expect(out).toEqual({
      $current_url: 'https://a.test/invite/[code]',
      $pathname: '/invite/[code]',
      $referrer: 'https://other.test/p',
      route: '/explore?x=1',
      $set: { $initial_current_url: 'https://a.test/x' },
      $set_once: { $initial_pathname: '/invite/[code]' },
    });
  });
});
