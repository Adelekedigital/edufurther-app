import { enterPath, safariHandoff } from './sessionEnter';

describe('enterPath', () => {
  it('the entry route, encoded; with the Safari ask only when asked (ADR 0013)', () => {
    expect(enterPath('b1')).toBe('/sessions/b1/enter');
    expect(enterPath('b 1/x')).toBe('/sessions/b%201%2Fx/enter');
    expect(enterPath('b1', { inSafari: true })).toBe('/sessions/b1/enter?open=safari');
  });
});

describe('safariHandoff (ADR 0013)', () => {
  it('an https link on exactly meet.google.com becomes x-safari-https', () => {
    expect(safariHandoff('https://meet.google.com/abc-defg-hij')).toBe(
      'x-safari-https://meet.google.com/abc-defg-hij',
    );
    expect(safariHandoff('https://MEET.google.com/abc?authuser=0#x')).toBe(
      'x-safari-https://meet.google.com/abc?authuser=0#x',
    );
  });

  it('anything else: null', () => {
    for (const url of [
      'http://meet.google.com/x',
      'https://meet.google.com.evil.test/x',
      'https://evil.meet.google.com/x',
      'https://meet.google.com:444/x',
      'https://u:p@meet.google.com/x',
      'https://edufurther.daily.co/room',
      'javascript:alert(1)',
      'x-safari-https://meet.google.com/x',
      '//meet.google.com/x',
      '',
    ]) {
      expect(safariHandoff(url), url).toBeNull();
    }
  });
});
