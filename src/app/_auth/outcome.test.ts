import type { OutcomeInput } from './outcome';

const base: OutcomeInput = {
  method: 'email',
  mode: 'login',
  role: 'mentee',
  isNew: false,
  firstName: 'Amara',
  isAdmin: false,
  isMentor: false,
  mentorApproved: false,
  googleJustLinked: false,
  next: null,
};

async function load(onboarding: boolean, mentorOnboarding = false) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_ONBOARDING_V5_ENABLED', onboarding ? 'true' : '');
  vi.stubEnv('NEXT_PUBLIC_MENTOR_ONBOARDING_ENABLED', mentorOnboarding ? 'true' : '');
  return (await import('./outcome')).signInOutcome;
}

afterEach(() => vi.unstubAllEnvs());

describe('signInOutcome — returning accounts', () => {
  it('sends a mentee to Home and a mentor to the dashboard', async () => {
    const out = await load(false);
    expect(out(base)).toEqual({
      icon: 'login',
      title: 'Welcome back, Amara',
      body: 'Opening your Home…',
      href: '/home',
    });
    expect(
      out({ ...base, firstName: 'Gbenga', isMentor: true, mentorApproved: true }),
    ).toMatchObject({
      body: 'Opening your mentor dashboard…',
      href: '/dashboard',
    });
  });

  it('sends a mentor not yet approved to the application review once it exists', async () => {
    const pending = { ...base, firstName: 'Gbenga', isMentor: true, mentorApproved: false };
    expect((await load(false))(pending)).toMatchObject({ href: '/dashboard' });
    expect((await load(false, true))(pending)).toMatchObject({
      href: '/mentor-application',
      body: 'Opening your application review…',
    });
  });

  it('lets a valid next win', async () => {
    const out = await load(false);
    expect(out({ ...base, next: '/mentors/gbenga' })).toMatchObject({
      href: '/mentors/gbenga',
      body: 'Taking you back to where you left off…',
    });
  });

  it('says so when an existing email signs up', async () => {
    const out = await load(false);
    expect(out({ ...base, mode: 'signup' })).toMatchObject({
      title: 'You already have an account',
      body: 'We logged you in instead. Opening your Home…',
      href: '/home',
    });
  });

  it('says Google is now linked, at log-in', async () => {
    const out = await load(false);
    expect(out({ ...base, method: 'google', googleJustLinked: true })).toMatchObject({
      icon: 'link',
      body: 'Google is now linked to your account. Opening your Home…',
    });
  });
});

describe('signInOutcome — new accounts', () => {
  const fresh = { ...base, isNew: true, mode: 'signup' as const };

  it('welcomes a new mentee and, with onboarding off, keeps them on /home', async () => {
    const out = await load(false);
    expect(out(fresh)).toEqual({
      icon: 'how_to_reg',
      title: 'Account created. Welcome, Amara',
      body: 'Next, let’s find your first mentor…',
      href: '/home',
    });
  });

  it('with onboarding off, sends a new mentee straight back to an interrupted page', async () => {
    const out = await load(false);
    expect(out({ ...fresh, next: '/mentors/gbenga' })).toMatchObject({
      href: '/mentors/gbenga',
      body: 'Taking you back to where you left off…',
    });
  });

  it('with onboarding on, sends every new mentee to /onboarding first', async () => {
    const out = await load(true);
    expect(out(fresh)).toMatchObject({ href: '/onboarding' });
    // A bare next isn't a booking: onboarding can't take them back to it, so
    // the toast doesn't promise to (PR 4 hands the booking over).
    expect(out({ ...fresh, next: '/mentors/gbenga' })).toMatchObject({
      href: '/onboarding',
      body: 'Next, let’s find your first mentor…',
    });
  });

  it('names a Google account by the way in', async () => {
    const out = await load(false);
    expect(out({ ...fresh, method: 'google' })).toMatchObject({
      title: 'Account created with Google',
    });
  });

  it('sends a new mentor home for now, saying so plainly', async () => {
    const out = await load(false);
    expect(out({ ...fresh, role: 'mentor', firstName: 'Gbenga' })).toEqual({
      icon: 'how_to_reg',
      title: 'Account created. Welcome, Gbenga',
      body: 'Opening your Home…',
      href: '/home',
    });
  });

  it('sends a new mentor to mentor onboarding once it is on', async () => {
    const out = await load(false, true);
    expect(out({ ...fresh, role: 'mentor', firstName: 'Gbenga' })).toMatchObject({
      href: '/onboarding/mentor',
      body: 'Opening your mentor application…',
    });
  });

  it('with onboarding on, sends every new account to the /onboarding entry, mentors marked', async () => {
    const out = await load(true, true);
    expect(out({ ...fresh, role: 'mentor', firstName: 'Gbenga' })).toMatchObject({
      href: '/onboarding?role=mentor',
    });
    // Log-in's page has no role: a never-named log-in is a mentee.
    expect(out({ ...fresh, mode: 'login', role: 'mentor' })).toMatchObject({ href: '/onboarding' });
  });

  it('treats a never-named account at log-in as new', async () => {
    const out = await load(false);
    expect(out({ ...base, isNew: true })).toMatchObject({
      title: 'Account created. Welcome, Amara',
    });
  });

  const reopen = '/mentors/gbenga?book=st1&at=2026-10-20T09%3A00%3A00Z';

  it('hands a booking in next to onboarding when it is on', async () => {
    const out = await load(true);
    expect(out({ ...fresh, method: 'google', next: reopen })).toMatchObject({
      href: '/onboarding?for=gbenga&sid=st1&time=2026-10-20T09%3A00%3A00Z',
      body: 'Next, a few quick questions, then back to your booking.',
    });
  });

  it('with onboarding off, returns a new account to its booking', async () => {
    const out = await load(false);
    expect(out({ ...fresh, method: 'google', next: reopen })).toMatchObject({
      href: reopen,
      body: 'Taking you back to your booking…',
    });
  });

  it('keeps a link into onboarding through sign-up', async () => {
    const out = await load(true);
    const into = '/onboarding?for=gbenga&sid=st1&time=2026-10-20T09%3A00%3A00Z';
    expect(out({ ...fresh, next: into })).toMatchObject({
      href: into,
      body: 'Next, a few quick questions, then back to your booking.',
    });
  });
});

describe('signInOutcome — returning to a booking', () => {
  it('names the booking when next is one', async () => {
    const out = await load(false);
    expect(
      out({ ...base, next: '/mentors/gbenga?book=st1&at=2026-10-20T09:00:00Z' }),
    ).toMatchObject({
      body: 'Taking you back to your booking…',
    });
  });
});

describe('signInOutcome — naming the mentor', () => {
  const reopen = '/mentors/gbenga?book=st1&at=2026-10-20T09:00:00Z';

  it('names who the booking is with, once known', async () => {
    const out = await load(false);
    expect(out({ ...base, next: reopen, bookingWith: 'Gbenga' })).toMatchObject({
      body: 'Taking you back to your booking with Gbenga…',
      href: reopen,
    });
    expect(out({ ...base, mode: 'signup', next: reopen, bookingWith: 'Gbenga' })).toMatchObject({
      title: 'You already have an account',
      body: 'We logged you in instead. Taking you back to your booking with Gbenga…',
    });
    expect(
      out({
        ...base,
        method: 'google',
        googleJustLinked: true,
        next: reopen,
        bookingWith: 'Gbenga',
      }),
    ).toMatchObject({
      body: 'Google is now linked to your account. Taking you back to your booking with Gbenga…',
    });
  });

  it('keeps the plain words while the mentor is unknown', async () => {
    const out = await load(false);
    expect(out({ ...base, next: reopen })).toMatchObject({
      body: 'Taking you back to your booking…',
    });
  });

  it('sends a new account through onboarding with the questions copy', async () => {
    const out = await load(true);
    expect(
      out({ ...base, isNew: true, mode: 'signup', next: reopen, bookingWith: 'Gbenga' }),
    ).toMatchObject({ body: 'Next, a few quick questions, then back to your booking.' });
  });

  it('says "your booking" for any next the page named a mentor for', async () => {
    const out = await load(false);
    expect(
      out({ ...base, next: '/onboarding?for=gbenga&sid=st1', bookingWith: 'Gbenga' }),
    ).toMatchObject({ body: 'Taking you back to your booking with Gbenga…' });
  });
});

describe('signInOutcome — a mentee whose onboarding is unfinished (PRD H5)', () => {
  it('opens onboarding at the first gap, once the flag is on', async () => {
    const out = await load(true);
    expect(out({ ...base, onboardingComplete: false })).toMatchObject({
      title: 'Welcome back, Amara',
      body: 'Opening your setup…',
      href: '/onboarding',
    });
  });

  it('leaves everyone else where they went', async () => {
    const on = await load(true);
    // Done, or /me doesn't say: Home.
    expect(on({ ...base, onboardingComplete: true }).href).toBe('/home');
    expect(on({ ...base, onboardingComplete: null }).href).toBe('/home');
    expect(on(base).href).toBe('/home');
    // A mentor or an admin never goes to mentee onboarding.
    expect(
      on({ ...base, isMentor: true, mentorApproved: true, onboardingComplete: false }).href,
    ).toBe('/dashboard');
    expect(on({ ...base, isAdmin: true, onboardingComplete: false }).href).toBe('/admin');
    // Any return path wins, a booking included: booking is never gated (PRD F4).
    const next = '/mentors/ada?book=st-1&at=2026-10-20T10:00:00Z';
    expect(on({ ...base, onboardingComplete: false, next }).href).toBe(next);
  });

  it('changes nothing with the flag off', async () => {
    const off = await load(false);
    expect(off({ ...base, onboardingComplete: false })).toMatchObject({
      body: 'Opening your Home…',
      href: '/home',
    });
  });
});
