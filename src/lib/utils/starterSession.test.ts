import { describe, expect, it } from 'vitest';
import { isStarterName } from './starterSession';

describe('isStarterName: the starter, by today’s name or the legacy one (owner, 2026-11-23)', () => {
  it('matches both names, ignoring case and spaces; nothing else', () => {
    expect(isStarterName('1:1 mentorship session')).toBe(true);
    expect(isStarterName(' 1:1 Mentorship Session ')).toBe(true);
    expect(isStarterName('Intro chat')).toBe(true);
    expect(isStarterName('INTRO CHAT')).toBe(true);
    expect(isStarterName('General Mentorship')).toBe(false);
    expect(isStarterName('Intro chat 2')).toBe(false);
  });
});
