import { serverRoute } from './PreviewRoot';

describe('serverRoute (routes the server answers as the admin, not the previewed user)', () => {
  it('the home redirect, relative or absolute on this site', () => {
    expect(serverRoute('/')).toBe('home');
    expect(serverRoute(`${window.location.origin}/`)).toBe('home');
  });

  it('Session Join’s entry route', () => {
    expect(serverRoute('/sessions/abc-1/enter')).toBe('enter');
    expect(serverRoute('/sessions/abc-1/enter/')).toBe('enter');
  });

  it('every other page, and other sites, are left alone', () => {
    expect(serverRoute('/sessions/abc-1')).toBeNull();
    expect(serverRoute('/home')).toBeNull();
    expect(serverRoute('/sessions/a/b/enter')).toBeNull();
    expect(serverRoute('https://elsewhere.example/')).toBeNull();
  });
});
