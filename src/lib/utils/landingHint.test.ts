import { encodeLanding, landingHomeFor } from './landingHint';

describe('landingHomeFor: the hint is honoured only for its own account and a mentor home', () => {
  it('the verified user’s own hint: their home, encoded or not', () => {
    const v = encodeLanding('u1', '/dashboard');
    expect(landingHomeFor(v, 'u1')).toBe('/dashboard');
    expect(landingHomeFor(encodeURIComponent(v), 'u1')).toBe('/dashboard');
    expect(landingHomeFor(encodeLanding('u1', '/mentor-application'), 'u1')).toBe(
      '/mentor-application',
    );
  });

  it('another account’s hint (a shared device), none, or a broken one: nothing', () => {
    expect(landingHomeFor(encodeLanding('u2', '/dashboard'), 'u1')).toBeNull();
    expect(landingHomeFor(undefined, 'u1')).toBeNull();
    expect(landingHomeFor('', 'u1')).toBeNull();
    expect(landingHomeFor(':/dashboard', 'u1')).toBeNull();
    expect(landingHomeFor('%E0%A4%A', 'u1')).toBeNull();
  });

  it('never a page outside the mentor homes: no open redirect, no mentee page', () => {
    for (const home of [
      '/home',
      '/explore',
      '//evil.test',
      'https://evil.test',
      '/dashboard/../x',
    ]) {
      expect(landingHomeFor(encodeLanding('u1', home), 'u1'), home).toBeNull();
    }
  });
});
