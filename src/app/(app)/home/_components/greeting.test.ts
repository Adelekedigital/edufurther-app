import { NEW_ACCOUNT_MS, greeting } from './greeting';

const now = new Date('2026-10-17T12:00:00Z');
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
const DAY = 24 * 60 * 60 * 1000;

describe('greeting', () => {
  it('says "Welcome" to an account under 7 days old with no session held', () => {
    expect(greeting('Amara', ago(DAY), 0, now)).toBe('Welcome, Amara');
  });

  it('says "Welcome back" once a session has been held', () => {
    expect(greeting('Amara', ago(DAY), 1, now)).toBe('Welcome back, Amara');
  });

  it('says "Welcome back" from the seventh day on', () => {
    expect(greeting('Amara', ago(NEW_ACCOUNT_MS - 1), 0, now)).toBe('Welcome, Amara');
    expect(greeting('Amara', ago(NEW_ACCOUNT_MS), 0, now)).toBe('Welcome back, Amara');
  });

  it('says "Welcome back" when the creation date is unknown', () => {
    expect(greeting('Amara', undefined, 0, now)).toBe('Welcome back, Amara');
  });
});
