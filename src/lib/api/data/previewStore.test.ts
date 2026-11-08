import {
  isPreviewing,
  previewSessionId,
  previewStore,
  resetPreviewStoreForTests,
  type PreviewUser,
} from './previewStore';

const KEY = 'ef-preview';

const user = (over: Partial<PreviewUser> = {}): PreviewUser => ({
  id: 'u-1',
  email: 'amara.okafor@example.com',
  name: 'Amara Okafor',
  firstName: 'Amara',
  initials: 'AO',
  role: 'mentee',
  ...over,
});

const start = (from: string | null = '/admin/mentors') =>
  previewStore.started('s-1', user(), { revealed: false, canReveal: true }, from);

beforeEach(() => {
  sessionStorage.clear();
  resetPreviewStoreForTests();
});

describe('previewStore: storage (PRD, Session end)', () => {
  it('stores only the session id and where it started: never a name or an email', () => {
    start();
    const raw = sessionStorage.getItem(KEY)!;
    expect(JSON.parse(raw)).toEqual({ id: 's-1', from: '/admin/mentors' });
    expect(raw).not.toContain('Amara');
    expect(raw).not.toContain('example.com');
  });

  it('a refresh keeps the preview: the stored id is read back, with no user until GET /{id}', () => {
    sessionStorage.setItem(KEY, JSON.stringify({ id: 's-9', from: '/admin/credits' }));
    expect(previewStore.get()).toMatchObject({
      sessionId: 's-9',
      startedFrom: '/admin/credits',
      user: null,
    });
    expect(isPreviewing()).toBe(true);
    expect(previewSessionId()).toBe('s-9');
  });

  it('ignores a stored value that is not ours: bad JSON, no id, a non-string from', () => {
    sessionStorage.setItem(KEY, '{nope');
    expect(previewStore.get().sessionId).toBeNull();

    resetPreviewStoreForTests();
    sessionStorage.setItem(KEY, JSON.stringify({ id: '', from: '/x' }));
    expect(previewStore.get().sessionId).toBeNull();

    resetPreviewStoreForTests();
    sessionStorage.setItem(KEY, JSON.stringify({ id: 's-2', from: 42 }));
    expect(previewStore.get()).toMatchObject({ sessionId: 's-2', startedFrom: null });
  });

  it('clear forgets the stored session', () => {
    start();
    previewStore.clear();
    expect(sessionStorage.getItem(KEY)).toBeNull();
    expect(isPreviewing()).toBe(false);
    expect(previewSessionId()).toBeNull();
  });

  it('blocked storage: the preview still works in this page', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    start();
    expect(isPreviewing()).toBe(true);
    spy.mockRestore();
  });

  it('the server snapshot is always nobody previewed', () => {
    start();
    expect(previewStore.getServer().sessionId).toBeNull();
  });
});

describe('previewStore: the return path is a path on this site', () => {
  it('a stored //elsewhere or absolute URL is dropped, never navigated to', () => {
    sessionStorage.setItem(KEY, JSON.stringify({ id: 's-9', from: '//evil.example' }));
    expect(previewStore.get()).toMatchObject({ sessionId: 's-9', startedFrom: null });
    resetPreviewStoreForTests();
    sessionStorage.setItem(KEY, JSON.stringify({ id: 's-9', from: 'https://evil.example/x' }));
    expect(previewStore.get().startedFrom).toBeNull();
  });

  it('a start with an unsafe path keeps none; a real one is kept', () => {
    const u = {
      id: 'u',
      email: 'a@x.test',
      name: 'A',
      firstName: 'A',
      initials: 'A',
      role: 'mentee' as const,
    };
    previewStore.started('s-1', u, { revealed: false, canReveal: false }, '//evil.example');
    expect(previewStore.get().startedFrom).toBeNull();
    previewStore.started('s-2', u, { revealed: false, canReveal: false }, '/admin/credits');
    expect(previewStore.get().startedFrom).toBe('/admin/credits');
  });
});

describe('previewStore: leaving a page between identities (code review)', () => {
  it('leave marks the page being left, unless the destination is the same page', () => {
    previewStore.leave('/admin/mentors', '/home');
    expect(previewStore.get().leaving).toBe('/admin/mentors');
    previewStore.arrived();
    expect(previewStore.get().leaving).toBeNull();
    previewStore.leave('/home', '/home');
    expect(previewStore.get().leaving).toBeNull();
  });

  it('a start, an exit and a server end keep the mark set just before them', () => {
    const u = {
      id: 'u',
      email: 'a@x.test',
      name: 'A',
      firstName: 'A',
      initials: 'A',
      role: 'mentee' as const,
    };
    previewStore.leave('/admin/mentors', '/home');
    previewStore.started('s-1', u, { revealed: false, canReveal: false }, '/admin/mentors');
    expect(previewStore.get().leaving).toBe('/admin/mentors');
    previewStore.arrived();
    previewStore.leave('/home', '/admin/mentors');
    previewStore.clear();
    expect(previewStore.get()).toMatchObject({ sessionId: null, leaving: '/home' });
  });
});

describe('previewStore: a cold store (only sessionStorage known)', () => {
  it('serverEnded reads the stored session first, so the end lands', () => {
    sessionStorage.setItem(KEY, JSON.stringify({ id: 's-9', from: '/admin/credits' }));
    previewStore.serverEnded('exit');
    expect(previewStore.get()).toMatchObject({
      sessionId: null,
      dropped: { returnTo: '/admin/credits' },
    });
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('blocked reads the stored session first, so the notice opens', () => {
    sessionStorage.setItem(KEY, JSON.stringify({ id: 's-9', from: null }));
    previewStore.blocked(true);
    expect(previewStore.get().blocked).toBe(true);
  });
});

describe('previewStore: actions', () => {
  it('open: the bar with nobody picked, no miss, no old notice', () => {
    previewStore.missed('ghost@example.com');
    previewStore.open();
    expect(previewStore.get()).toMatchObject({ open: true, miss: null, ended: null });
    expect(isPreviewing()).toBe(false);
  });

  it('missed: the bar opens with the unknown value', () => {
    previewStore.missed('ghost@example.com');
    expect(previewStore.get()).toMatchObject({ open: true, miss: 'ghost@example.com' });
    expect(isPreviewing()).toBe(false);
  });

  it('started: the session, who, the reveal grant; the bar closes and any note goes', () => {
    previewStore.missed('ghost@example.com');
    start();
    expect(previewStore.get()).toMatchObject({
      sessionId: 's-1',
      user: user(),
      revealed: false,
      canReveal: true,
      startedFrom: '/admin/mentors',
      open: false,
      miss: null,
      blocked: false,
      ended: null,
    });
  });

  it('a switch (no from) keeps where the preview started', () => {
    start('/admin/credits');
    previewStore.started('s-2', user({ id: 'u-2' }), { revealed: true, canReveal: true });
    expect(previewStore.get()).toMatchObject({ sessionId: 's-2', startedFrom: '/admin/credits' });
    expect(JSON.parse(sessionStorage.getItem(KEY)!)).toEqual({ id: 's-2', from: '/admin/credits' });
  });

  it('revealed: on for the rest of the session', () => {
    start();
    previewStore.revealed();
    expect(previewStore.get().revealed).toBe(true);
  });

  it('clear can carry an ended notice', () => {
    start();
    const ended = { name: 'Amara Okafor', reason: 'idle' as const, returnTo: '/admin/mentors' };
    previewStore.clear(ended);
    expect(previewStore.get()).toMatchObject({ sessionId: null, user: null, ended });
  });

  it('blocked: only while previewing; turning it off always works', () => {
    previewStore.blocked(true);
    expect(previewStore.get().blocked).toBe(false);
    start();
    previewStore.blocked(true);
    expect(previewStore.get().blocked).toBe(true);
    previewStore.blocked(false);
    expect(previewStore.get().blocked).toBe(false);
  });

  it('deny: the ?viewAs= path that shows not found; clear forgets it', () => {
    previewStore.deny('/home');
    expect(previewStore.get().denied).toBe('/home');
    expect(isPreviewing()).toBe(false);
    previewStore.clear();
    expect(previewStore.get().denied).toBeNull();
  });

  it('dismissEnded drops the notice', () => {
    start();
    previewStore.serverEnded('idle');
    previewStore.dismissEnded();
    expect(previewStore.get().ended).toBeNull();
  });

  it('subscribers hear every change, and stop after unsubscribing', () => {
    const l = vi.fn();
    const off = previewStore.subscribe(l);
    previewStore.open();
    start();
    expect(l).toHaveBeenCalledTimes(2);
    off();
    previewStore.clear();
    expect(l).toHaveBeenCalledTimes(2);
  });
});

describe('previewStore.serverEnded', () => {
  it.each(['idle', 'max_length'] as const)(
    '%s: "Preview ended" with the name and the page it started from',
    (reason) => {
      start('/admin/credits');
      previewStore.serverEnded(reason);
      expect(previewStore.get()).toMatchObject({
        sessionId: null,
        user: null,
        ended: { name: 'Amara Okafor', reason, returnTo: '/admin/credits' },
        dropped: null,
      });
      expect(sessionStorage.getItem(KEY)).toBeNull();
    },
  );

  it('a name passed in wins (the read-back after a refresh knows it, the store does not)', () => {
    sessionStorage.setItem(KEY, JSON.stringify({ id: 's-9', from: null }));
    // As in the app: usePreview read the stored session before the read-back answers.
    expect(previewStore.get().user).toBeNull();
    previewStore.serverEnded('max_length', 'Tunde Bello');
    expect(previewStore.get().ended).toEqual({
      name: 'Tunde Bello',
      reason: 'max_length',
      returnTo: null,
    });
  });

  it.each(['exit', 'sign_out', null] as const)('%s: ends quietly, back where it started', (r) => {
    start('/admin/mentors');
    previewStore.serverEnded(r);
    expect(previewStore.get()).toMatchObject({
      sessionId: null,
      ended: null,
      dropped: { returnTo: '/admin/mentors' },
    });
  });

  it('only once: with no live session it changes nothing', () => {
    previewStore.serverEnded('idle');
    expect(previewStore.get().ended).toBeNull();
    start();
    previewStore.serverEnded('idle');
    const first = previewStore.get();
    previewStore.serverEnded('max_length');
    expect(previewStore.get()).toBe(first);
  });

  it('settled clears the drop, and is a no-op otherwise', () => {
    const l = vi.fn();
    previewStore.subscribe(l);
    previewStore.settled();
    expect(l).not.toHaveBeenCalled();
    start();
    previewStore.serverEnded(null);
    previewStore.settled();
    expect(previewStore.get().dropped).toBeNull();
  });
});
