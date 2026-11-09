import { checkLine, fillSample, lengthWarning, valueNames } from './emailLines';

const KNOWN = ['mentorName', 'menteeName', 'sessionDate', 'code'];
const CARRIED = ['mentorName', 'sessionDate'];

describe('checkLine', () => {
  it('a blank line is empty', () => {
    expect(checkLine('   ', 'subject', KNOWN, CARRIED)).toEqual({ code: 'empty' });
  });

  it('the hard max counts the raw text', () => {
    expect(checkLine('x'.repeat(33), 'button', KNOWN, CARRIED)).toEqual({ code: 'too_long' });
    expect(checkLine('x'.repeat(32), 'button', KNOWN, CARRIED)).toBeNull();
  });

  it('an unknown value suggests a case-insensitive match', () => {
    expect(checkLine('Hi {mentorname}', 'subject', KNOWN, CARRIED)).toEqual({
      code: 'unknown_value',
      value: 'mentorname',
      suggestion: 'mentorName',
    });
    expect(checkLine('Hi {nope}', 'subject', KNOWN, CARRIED)).toEqual({
      code: 'unknown_value',
      value: 'nope',
    });
  });

  it('the names the lines fill are never allowed, even when catalogued', () => {
    expect(checkLine('{emailSubject}', 'heading', [...KNOWN, 'emailSubject'], CARRIED)).toEqual({
      code: 'unknown_value',
      value: 'emailSubject',
    });
  });

  it('a known value this email does not carry', () => {
    expect(checkLine('With {menteeName}', 'heading', KNOWN, CARRIED)).toEqual({
      code: 'value_not_sent',
      value: 'menteeName',
    });
  });

  it('a good line passes', () => {
    expect(
      checkLine('Your session with {mentorName} is booked', 'subject', KNOWN, CARRIED),
    ).toBeNull();
  });
});

it('valueNames lists every {name} in order', () => {
  expect(valueNames('{a} and {b} then {a}')).toEqual(['a', 'b', 'a']);
});

it('fillSample fills carried values and leaves the rest as {name}', () => {
  expect(
    fillSample(
      '{mentorName} on {sessionDate} with {menteeName}',
      { mentorName: 'Tunde', sessionDate: 'Tue', menteeName: 'Amara' },
      CARRIED,
    ),
  ).toBe('Tunde on Tue with {menteeName}');
});

describe('lengthWarning', () => {
  it('subject: under 20 is short, over 60 is long', () => {
    expect(lengthWarning('subject', 19)).toBe('short');
    expect(lengthWarning('subject', 20)).toBeNull();
    expect(lengthWarning('subject', 61)).toBe('long');
  });
  it('heading and button have no minimum', () => {
    expect(lengthWarning('heading', 1)).toBeNull();
    expect(lengthWarning('button', 26)).toBe('long');
  });
});
