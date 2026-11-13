import { nextRemaining } from './nextRemaining';

describe('nextRemaining', () => {
  it('the next row still there, else the one before, else none', () => {
    expect(nextRemaining(['a', 'b', 'c'], 'b', ['a', 'b', 'c'])).toBe('c');
    expect(nextRemaining(['a', 'b', 'c'], 'c', ['a', 'b', 'c'])).toBe('b');
    expect(nextRemaining(['a', 'b'], 'a', ['a'])).toBeNull();
  });

  it('skips a neighbour another delete took since the click (issue 128)', () => {
    expect(nextRemaining(['c', 'a', 'b'], 'b', ['c'])).toBe('c');
    expect(nextRemaining(['a', 'b', 'c'], 'a', ['c'])).toBe('c');
  });

  it('a row not in the order falls back to the first left', () => {
    expect(nextRemaining(['a', 'b'], 'x', ['b'])).toBe('b');
  });
});
