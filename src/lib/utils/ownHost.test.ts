import { isOwnHost } from './ownHost';

describe('isOwnHost', () => {
  it.each([
    'edufurther.org',
    'EduFurther.org',
    'www.edufurther.org',
    'staging.edufurther.org',
    'localhost',
    '127.0.0.1',
    'edufurther-app.vercel.app',
    'edufurther-app-abc123-team.vercel.app',
    'edufurther-app-git-feat-x-team.vercel.app',
  ])('%s is ours', (host) => {
    expect(isOwnHost(host)).toBe(true);
  });

  it('the app’s own host, wherever it is deployed', () => {
    expect(isOwnHost('app.example.test', 'app.example.test')).toBe(true);
  });

  it.each([
    'l.instagram.com',
    'notedufurther.org',
    'edufurther.org.evil.com',
    'other-app.vercel.app',
    'vercel.app',
    '',
  ])('%j is not', (host) => {
    expect(isOwnHost(host, 'app.edufurther.org')).toBe(false);
  });
});
