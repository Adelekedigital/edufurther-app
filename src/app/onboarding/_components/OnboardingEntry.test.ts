import { describe, expect, it } from 'vitest';
import { onboardingDestination } from './OnboardingEntry';

type Viewer = Parameters<typeof onboardingDestination>[0];
const member = (isMentor: boolean) => ({ kind: 'member', id: 'u1', isMentor }) as Viewer;
const q = (s = '') => new URLSearchParams(s);

describe('onboardingDestination', () => {
  it('sends a mentee to the mentee flow, keeping the query', () => {
    expect(onboardingDestination(member(false), q('for=ada&sid=s1&time=2026-10-20T10%3A00Z'))).toBe(
      '/onboarding/mentee?for=ada&sid=s1&time=2026-10-20T10%3A00Z',
    );
    expect(onboardingDestination(member(false), q())).toBe('/onboarding/mentee');
  });

  it('sends a mentor, or a new account marked role=mentor, home until mentor onboarding ships', () => {
    expect(onboardingDestination(member(true), q())).toBe('/home');
    expect(onboardingDestination(member(false), q('role=mentor'))).toBe('/home');
    // Only the literal value counts.
    expect(onboardingDestination(member(false), q('role=admin'))).toBe(
      '/onboarding/mentee?role=admin',
    );
  });

  it('asks a guest to sign up first, coming back here', () => {
    expect(onboardingDestination({ kind: 'guest' }, q('for=ada'))).toBe(
      '/signup?next=%2Fonboarding%3Ffor%3Dada',
    );
  });

  it('waits while the viewer loads', () => {
    expect(onboardingDestination({ kind: 'loading', signedIn: null }, q())).toBeNull();
  });
});
