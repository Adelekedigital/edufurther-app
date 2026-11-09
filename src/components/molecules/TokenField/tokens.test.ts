import {
  findTrigger,
  insertValue,
  matchValues,
  oneLine,
  segments,
  valueAfter,
  valueBefore,
  tokenEnd,
} from './tokens';

describe('segments', () => {
  it('splits plain text, known values and unknown values', () => {
    expect(segments('Hi {mentorName}, {nope}!', ['mentorName'])).toEqual([
      { text: 'Hi ', kind: 'text' },
      { text: '{mentorName}', kind: 'value' },
      { text: ', ', kind: 'text' },
      { text: '{nope}', kind: 'unknown' },
      { text: '!', kind: 'text' },
    ]);
  });

  it('a name is matched exactly: another case is unknown', () => {
    expect(segments('{mentorname}', ['mentorName'])[0]!.kind).toBe('unknown');
  });

  it('an unclosed brace is plain text', () => {
    expect(segments('Hi {mentor', ['mentor'])).toEqual([{ text: 'Hi {mentor', kind: 'text' }]);
  });
});

describe('tokenEnd', () => {
  it('reaches the } of the value the caret is inside', () => {
    expect(tokenEnd('Hi {mentorname} x', 6)).toBe(15);
  });
  it('stops at a space or another {: the caret when nothing closes it', () => {
    expect(tokenEnd('Hi {men there}', 7)).toBe(7);
    expect(tokenEnd('Hi {men{x}', 7)).toBe(7);
    expect(tokenEnd('Hi {men', 7)).toBe(7);
  });
});

describe('findTrigger', () => {
  it.each([
    ['/', 1, { from: 0, query: '' }],
    ['Hi /men', 7, { from: 3, query: 'men' }],
    ['Hi {men', 7, { from: 3, query: 'men' }],
    ['(/x', 3, { from: 1, query: 'x' }],
    ['“/x', 3, { from: 1, query: 'x' }],
    ["'/x", 3, { from: 1, query: 'x' }],
  ])('%j at %d opens', (text, caret, want) => {
    expect(findTrigger(text, caret, 'slashAndBrace')).toEqual(want);
  });

  it('the query takes digits, _ and accented letters', () => {
    expect(findTrigger('/first_2', 8, 'slashAndBrace')).toEqual({ from: 0, query: 'first_2' });
    expect(findTrigger('/créneau', 8, 'slashAndBrace')).toEqual({ from: 0, query: 'créneau' });
  });

  it('a slash inside a word does not open (and/or)', () => {
    expect(findTrigger('and/or', 6, 'slashAndBrace')).toBeNull();
  });

  it('only the text before the caret counts', () => {
    expect(findTrigger('Hi /men there', 7, 'slashAndBrace')).toEqual({ from: 3, query: 'men' });
    expect(findTrigger('Hi /men there', 13, 'slashAndBrace')).toBeNull();
  });

  it('slash mode ignores {', () => {
    expect(findTrigger('Hi {men', 7, 'slash')).toBeNull();
    expect(findTrigger('Hi /men', 7, 'slash')).toEqual({ from: 3, query: 'men' });
  });
});

describe('insertValue', () => {
  it('replaces the trigger and query, with a space after before more text', () => {
    expect(insertValue('Hi /menthere', 'mentorName', 3, 7)).toEqual({
      text: 'Hi {mentorName} there',
      caret: 16,
    });
  });

  it('adds a space before when the text runs into it', () => {
    expect(insertValue('Hi', 'x', 2, 2)).toEqual({ text: 'Hi {x}', caret: 6 });
  });

  it('no space before after an opening bracket or at the start', () => {
    expect(insertValue('(', 'x', 1, 1).text).toBe('({x}');
    expect(insertValue('', 'x', 0, 0)).toEqual({ text: '{x}', caret: 3 });
  });

  it.each(['.', ',', '!', '?', ':', ';', ')', '”', '’', ' '])(
    'no space after before %j',
    (next) => {
      expect(insertValue(`Hi /${next}`, 'x', 3, 4).text).toBe(`Hi {x}${next}`);
    },
  );
});

describe('valueBefore / valueAfter', () => {
  const t = 'Hi {a} there {b}';
  it('finds the value that ends at the caret', () => {
    expect(valueBefore(t, 6)).toEqual([3, 6]);
    expect(valueBefore(t, 5)).toBeNull();
  });
  it('finds the value that starts at the caret', () => {
    expect(valueAfter(t, 13)).toEqual([13, 16]);
    expect(valueAfter(t, 12)).toBeNull();
  });
  it('agrees with the mirror: text with a stray brace is not one value', () => {
    expect(valueBefore('{a} x}', 6)).toBeNull();
    expect(valueBefore('{a}}', 4)).toBeNull();
    expect(valueAfter('{a{b}', 0)).toBeNull();
    expect(segments('{a{b}', ['b']).map((s) => s.kind)).toEqual(['text', 'value']);
  });

  it('a lone brace is not a value', () => {
    expect(valueBefore('a}', 2)).toBeNull();
    expect(valueAfter('{a', 0)).toBeNull();
  });
});

describe('matchValues', () => {
  const vals = [
    { name: 'mentorName', meaning: 'Mentor’s full name' },
    { name: 'sessionDate', meaning: 'Session date' },
  ];
  it('matches name or meaning, ignoring case', () => {
    expect(matchValues(vals, 'MENTOR').map((v) => v.name)).toEqual(['mentorName']);
    expect(matchValues(vals, 'date').map((v) => v.name)).toEqual(['sessionDate']);
  });
  it('an empty query lists them all', () => {
    expect(matchValues(vals, '')).toHaveLength(2);
  });
});

it('oneLine turns every kind of line break into a space', () => {
  expect(oneLine('a\nb\r\nc\rd')).toBe('a b c d');
});
