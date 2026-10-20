import { describe, expect, it, vi } from 'vitest';
import { onboardingDestination } from './OnboardingEntry';

type Viewer = Parameters<typeof onboardingDestination>[0];
const member = (isMentor: boolean, isApprovedMentor = false, mentorApprovedSeen?: boolean) =>
  ({ kind: 'member', id: 'u1', isMentor, isApprovedMentor, mentorApprovedSeen }) as Viewer;
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

describe('onboardingDestination — mentor onboarding on (PRD F4)', () => {
  async function load() {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_MENTOR_ONBOARDING_ENABLED', 'true');
    return (await import('./OnboardingEntry')).onboardingDestination;
  }

  it('sends a new mentor to the steps and an applicant to their application, keeping the query', async () => {
    const dest = await load();
    expect(dest(member(false), q('role=mentor'))).toBe('/onboarding/mentor?role=mentor');
    expect(dest(member(true), q('utm=email'))).toBe('/mentor-application?utm=email');
    expect(dest(member(true), q())).toBe('/mentor-application');
  });

  it('a mentor sign-up remembered on the account continues as a mentor without the query', async () => {
    const dest = await load();
    const signedUp = { ...member(false), signedUpAsMentor: true } as Viewer;
    expect(dest(signedUp, q())).toBe('/onboarding/mentor');
    expect(dest(signedUp, q('utm=email'))).toBe('/onboarding/mentor?utm=email');
  });

  it('sends an approved mentor to the dashboard, after the approved screen once', async () => {
    const dest = await load();
    expect(dest(member(true, true), q())).toBe('/dashboard');
    expect(dest(member(true, true, true), q())).toBe('/dashboard');
    expect(dest(member(true, true, false), q())).toBe('/mentor-application');
  });
});
