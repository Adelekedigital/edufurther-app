import { emailTypoFix, isEmail, normaliseEmail } from './emailTypo';

describe('emailTypoFix', () => {
  it.each([
    ['amara@gmial.com', 'amara@gmail.com'],
    ['amara@gmal.com', 'amara@gmail.com'],
    ['amara@gmai.com', 'amara@gmail.com'],
    ['amara@gmail.co', 'amara@gmail.com'],
    ['amara@gamil.com', 'amara@gmail.com'],
    ['amara@yaho.com', 'amara@yahoo.com'],
    ['amara@yahoo.co', 'amara@yahoo.com'],
    ['amara@hotmal.com', 'amara@hotmail.com'],
    ['amara@outlok.com', 'amara@outlook.com'],
    ['amara@outlook.co', 'amara@outlook.com'],
    ['amara@icloud.co', 'amara@icloud.com'],
  ])('fixes %s', (typed, fixed) => {
    expect(emailTypoFix(typed)).toBe(fixed);
  });

  it('suggests the normalised address', () => {
    expect(emailTypoFix('  Amara.O@GMIAL.com ')).toBe('amara.o@gmail.com');
  });

  it('suggests nothing for a correct or unknown domain', () => {
    expect(emailTypoFix('amara@gmail.com')).toBeNull();
    expect(emailTypoFix('amara@school.edu.ng')).toBeNull();
  });

  it('suggests nothing while the address is half typed', () => {
    expect(emailTypoFix('amara')).toBeNull();
    expect(emailTypoFix('amara@')).toBeNull();
    expect(emailTypoFix('@gmial.com')).toBeNull();
    expect(emailTypoFix('a@b@gmial.com')).toBeNull();
  });
});

describe('normaliseEmail / isEmail', () => {
  it('trims and lowercases', () => {
    expect(normaliseEmail('  Amara@Example.COM ')).toBe('amara@example.com');
  });

  it('checks the basic shape', () => {
    expect(isEmail(' amara@example.com ')).toBe(true);
    expect(isEmail('amara@example')).toBe(false);
    expect(isEmail('amara example.com')).toBe(false);
  });
});
