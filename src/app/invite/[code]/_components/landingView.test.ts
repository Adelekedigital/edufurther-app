import type { Viewer } from '@/types/mentor';
import { landingView } from './landingView';

const inviter = { firstName: 'Damilola', photoUrl: null };
const idle = { data: null, isLoading: false, error: null };
const loading = { data: null, isLoading: true, error: null };
const guest: Viewer = { kind: 'guest' };
const member = (over: object = {}) =>
  ({ kind: 'member', id: 'u1', isMentor: false, ...over }) as unknown as Viewer;

const view = (viewer: Viewer, lookup = idle as never, ownCode = idle as never) =>
  landingView({ code: 'damilola-7k2x', viewer, lookup, ownCode });

describe('landingView', () => {
  it('shows only the header while the viewer is unknown', () => {
    expect(view({ kind: 'loading', signedIn: null })).toEqual({ kind: 'pending' });
    expect(view({ kind: 'loading', signedIn: true })).toEqual({ kind: 'pending' });
  });

  it('a guest: header while the lookup runs, then the welcome, remembering the code', () => {
    expect(view(guest, loading as never)).toEqual({ kind: 'pending' });
    expect(view(guest, { ...idle, data: inviter } as never)).toEqual({
      kind: 'welcome',
      inviter,
      remember: 'save',
    });
  });

  it('a guest on a link that can’t be joined: the broken version, and the code is cleared', () => {
    expect(view(guest)).toEqual({ kind: 'broken', remember: 'clear' });
  });

  it('a guest whose lookup failed: the broken version, but the code is kept for the claim', () => {
    expect(view(guest, { ...idle, error: new Error('429') } as never)).toEqual({
      kind: 'broken',
      remember: 'save',
    });
  });

  it('a mentee on someone else’s link: the existing-account card, whatever the lookup says', () => {
    expect(view(member(), loading as never, { ...idle, data: 'tunde-9q4z' } as never)).toEqual({
      kind: 'existing',
    });
  });

  it('a mentee waits for their own code, then their own link opens Home with InviteModal', () => {
    expect(view(member(), idle as never, loading as never)).toEqual({ kind: 'pending' });
    expect(view(member(), idle as never, { ...idle, data: 'damilola-7k2x' } as never)).toEqual({
      kind: 'redirect',
      to: '/home?invite=open',
    });
  });

  it('a mentee whose own code can’t be read: the card (it only says they have an account)', () => {
    expect(view(member(), idle as never, { ...idle, error: new Error('x') } as never)).toEqual({
      kind: 'existing',
    });
  });

  it('a mentor, or a mentor sign-up, goes to their Home', () => {
    expect(view(member({ isMentor: true }))).toEqual({ kind: 'redirect', to: '/' });
    expect(view(member({ signedUpAsMentor: true }))).toEqual({ kind: 'redirect', to: '/' });
  });

  it('a sign-in with no usable account goes to /, which explains it', () => {
    expect(view({ kind: 'unlinked' })).toEqual({ kind: 'redirect', to: '/' });
    expect(view({ kind: 'accountExists' })).toEqual({ kind: 'redirect', to: '/' });
    expect(view({ kind: 'error', retry: () => {}, retrying: false })).toEqual({
      kind: 'redirect',
      to: '/',
    });
  });
});
