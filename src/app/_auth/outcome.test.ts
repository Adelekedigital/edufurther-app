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
    expect(out({ ...base, firstName: 'Gbenga', isMentor: true, mentorApproved: true })).toMatchObject({
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
    expect(out({ ...fresh, next: '/mentors/gbenga' })).toMatchObject({
      href: '/onboarding',
      body: 'Next, a few quick questions, then back to your booking.',
    });
  });

  it('names a Google account by the way in', async () => {
    const out = await load(false);
    expect(out({ ...fresh, method: 'google' })).toMatchObject({ title: 'Account created with Google' });
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
    expect(out({ ...base, isNew: true })).toMatchObject({ title: 'Account created. Welcome, Amara' });
  });
});
