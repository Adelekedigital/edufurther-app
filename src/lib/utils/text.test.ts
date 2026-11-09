import { norm, safeDecode } from './text';

it('norm ignores case and accents', () => {
  expect(norm('Côte d’Ivoire')).toBe('cote d’ivoire');
});

describe('safeDecode', () => {
  it('decodes a good %-sequence', () => {
    expect(safeDecode('ada%20okafor')).toBe('ada okafor');
  });
  it('is null for a malformed one, never a throw', () => {
    expect(safeDecode('%E0')).toBeNull();
  });
});
