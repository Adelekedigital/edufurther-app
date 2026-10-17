import { NAME_PART_MAX, checkFullName, checkNamePart, splitFullName, tidyName } from './name';

describe('splitFullName', () => {
  it('takes the first word as the first name and the rest as the last name', () => {
    expect(splitFullName('Chiamaka Ngozi Obi')).toEqual({
      firstName: 'Chiamaka',
      lastName: 'Ngozi Obi',
    });
  });

  it('trims and collapses spaces before splitting', () => {
    expect(splitFullName('  Amara   Okafor ')).toEqual({ firstName: 'Amara', lastName: 'Okafor' });
    expect(tidyName('  Amara \t  Okafor ')).toBe('Amara Okafor');
  });

  it('leaves the last name empty for one word', () => {
    expect(splitFullName('Amara')).toEqual({ firstName: 'Amara', lastName: '' });
  });
});

describe('checkFullName', () => {
  it.each([
    'Amara Okafor',
    'Chiamaka Ngozi Obi',
    'Adébáyọ̀ Ọlásùnkànmí', // Yoruba: accents and dot-below combining marks
    'Ọ̀ṣun Ìgbò',
    'Mary-Jane O’Neil',
    "Sean O'Brien",
    'J. R. Tolkien',
    'Zoë Ångström',
  ])('accepts %s', (name) => {
    expect(checkFullName(name)).toBeNull();
  });

  it('asks for a name when empty', () => {
    expect(checkFullName('   ')).toBe('required');
  });

  it('asks for a last name when there is one word', () => {
    expect(checkFullName('Amara')).toBe('oneWord');
    expect(checkFullName('  Amara  ')).toBe('oneWord');
  });

  it.each(['Amara 0kafor', 'J0hn Smith', 'Amara Okafor!', 'Amara @Okafor', 'Amara - Okafor'])(
    'refuses digits, symbols and letterless words: %s',
    (name) => {
      expect(checkFullName(name)).toBe('characters');
    },
  );

  it('reports characters before one word', () => {
    expect(checkFullName('J0hn')).toBe('characters');
  });

  it('limits each part, not the whole name', () => {
    const long = 'a'.repeat(NAME_PART_MAX);
    expect(checkFullName(`${long} ${long}`)).toBeNull();
    expect(checkFullName(`${long}a Okafor`)).toBe('tooLong');
    expect(checkFullName(`Amara ${long}a`)).toBe('tooLong');
  });
});

describe('how the name was typed', () => {
  const yoruba = 'Adébáyọ̀ Ọlásùnkànmí';

  it('treats decomposed input (letter + marks) like the composed name', () => {
    const typed = yoruba.normalize('NFD');
    expect(typed).not.toBe(yoruba.normalize('NFC'));
    expect(checkFullName(typed)).toBeNull();
    expect(tidyName(typed)).toBe(yoruba.normalize('NFC'));
    expect(splitFullName(typed).firstName).toBe('Adébáyọ̀'.normalize('NFC'));
  });

  it('measures length on the composed form', () => {
    const word = 'ọ̀'.repeat(30); // 60 composed units, 90 decomposed
    expect(checkFullName(`${word.normalize('NFD')} Obi`)).toBeNull();
  });

  it('drops invisible characters pasted along with a name', () => {
    expect(checkFullName('Amara​ Oka­for﻿')).toBeNull();
    expect(tidyName('Amara​ Oka­for')).toBe('Amara Okafor');
  });

  it('refuses a pile of marks on one letter', () => {
    // Composing folds the first acute into "á", leaving four marks on it.
    expect(checkFullName(`a${'́'.repeat(5)} Okafor`)).toBe('characters');
    expect(checkFullName(`a${'́'.repeat(3)} Okafor`)).toBeNull();
  });
});

describe('checkNamePart', () => {
  it('accepts one or more words', () => {
    expect(checkNamePart('Amara')).toBeNull();
    expect(checkNamePart('Ngozi Obi')).toBeNull();
  });

  it('shares the character rule with the full name', () => {
    expect(checkNamePart('Ọlásùnkànmí')).toBeNull();
    expect(checkNamePart('Ok4for')).toBe('characters');
    expect(checkNamePart('')).toBe('required');
    expect(checkNamePart('a'.repeat(NAME_PART_MAX + 1))).toBe('tooLong');
  });
});
