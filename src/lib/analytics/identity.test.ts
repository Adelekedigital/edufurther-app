import type { Viewer } from '@/types/mentor';
import { SIGNED_OUT_COOKIE, readSignedOut } from './consent';
import {
  knownMigrated,
  personProperties,
  rememberMigrated,
  resetIdentity,
  resetIdentityForTests,
} from './identity';

const reset = vi.fn();
vi.mock('./track', () => ({ reset: () => reset() }));

const member = (over: Record<string, unknown> = {}) =>
  ({ kind: 'member', id: 'u1', isMentor: false, ...over }) as Extract<Viewer, { kind: 'member' }>;

beforeEach(() => {
  localStorage.clear();
  resetIdentityForTests();
  document.cookie = `${SIGNED_OUT_COOKIE}=; Path=/; Max-Age=0`;
});

describe('personProperties', () => {
  it('role from primary_role, is_migrated when known, signup from the acquisition answer', () => {
    expect(
      personProperties(member({ primaryRole: 'mentor', isMigrated: true }), {
        source: 'invite',
        channel: null,
      }),
    ).toEqual({
      user_id: 'u1',
      role: 'mentor',
      is_migrated: true,
      signup_source: 'invite',
      signup_channel: null,
    });
  });

  it('leaves out what is not known, and never carries a name or email: the id, never the person', () => {
    const p = personProperties(member({ firstName: 'Ada', email: 'a@x.test' }), null);
    // user_id is the database id (= the distinct id), so PostHog can show and search by it.
    expect(p).toEqual({ user_id: 'u1', role: 'mentee' });
  });
});

describe('the remembered is_migrated', () => {
  it('stays in memory until identified', () => {
    expect(knownMigrated()).toBeUndefined();
    rememberMigrated(undefined, true);
    expect(knownMigrated()).toBeUndefined();
    rememberMigrated(true, false);
    expect(knownMigrated()).toBe(true);
    expect(localStorage.getItem('ef-is-migrated')).toBeNull();
  });

  it('is written to the device once identified, and removed when not', () => {
    rememberMigrated(false, true);
    expect(localStorage.getItem('ef-is-migrated')).toBe('0');
    rememberMigrated(false, false);
    expect(localStorage.getItem('ef-is-migrated')).toBeNull();
    expect(knownMigrated()).toBe(false);
  });

  it('log-out clears it and the sent list, and records the time', () => {
    rememberMigrated(true, true);
    localStorage.setItem('ef-acquisition-sent', '["u1"]');
    resetIdentity();
    expect(reset).toHaveBeenCalled();
    expect(knownMigrated()).toBeUndefined();
    expect(localStorage.getItem('ef-acquisition-sent')).toBeNull();
    expect(readSignedOut()).not.toBeNull();
  });
});
