import type { Viewer } from '@/types/mentor';
import { knownMigrated, personProperties, rememberMigrated, resetIdentity } from './identity';

const reset = vi.fn();
vi.mock('./track', () => ({ reset: () => reset() }));

const member = (over: Record<string, unknown> = {}) =>
  ({ kind: 'member', id: 'u1', isMentor: false, ...over }) as Extract<Viewer, { kind: 'member' }>;

beforeEach(() => localStorage.clear());

describe('personProperties', () => {
  it('role from primary_role, is_migrated when known, signup from the acquisition answer', () => {
    expect(
      personProperties(member({ primaryRole: 'mentor', isMigrated: true }), {
        source: 'invite',
        channel: null,
      }),
    ).toEqual({ role: 'mentor', is_migrated: true, signup_source: 'invite', signup_channel: null });
  });

  it('leaves out what is not known, and never carries a name or email', () => {
    const p = personProperties(member({ firstName: 'Ada', email: 'a@x.test' }), null);
    expect(p).toEqual({ role: 'mentee' });
  });
});

describe('the remembered is_migrated', () => {
  it('is kept from the signed-in /me and cleared on log-out', () => {
    expect(knownMigrated()).toBeUndefined();
    rememberMigrated(undefined);
    expect(knownMigrated()).toBeUndefined();
    rememberMigrated(false);
    expect(knownMigrated()).toBe(false);
    rememberMigrated(true);
    expect(knownMigrated()).toBe(true);
    resetIdentity();
    expect(reset).toHaveBeenCalled();
    expect(knownMigrated()).toBeUndefined();
  });
});
