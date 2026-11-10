import { identify, reset, resetForTests, setBlocked, setConsent, track, type Sink } from './track';

const sink = (): Sink & { calls: unknown[][] } => {
  const calls: unknown[][] = [];
  return {
    calls,
    capture: (e, p) => calls.push(['capture', e, p]),
    identify: (id, p) => calls.push(['identify', id, p]),
    reset: () => calls.push(['reset']),
  };
};

beforeEach(() => resetForTests());

describe('track', () => {
  it('waits in memory until consent, then sends in order', () => {
    track('mentor_profile_viewed', { source: 'explore' });
    identify('u1', { role: 'mentee' });
    const s = sink();
    setConsent(true, s);
    expect(s.calls).toEqual([
      ['capture', 'mentor_profile_viewed', { source: 'explore' }],
      ['identify', 'u1', { role: 'mentee' }],
    ]);
    track('pwa_installed', {});
    expect(s.calls.at(-1)).toEqual(['capture', 'pwa_installed', {}]);
  });

  it('a decline drops what waited and sends nothing after', () => {
    track('pwa_installed', {});
    setConsent(false);
    const s = sink();
    setConsent(true, s);
    expect(s.calls).toEqual([]);
  });

  it('withdrawing stops sending in the same session', () => {
    const s = sink();
    setConsent(true, s);
    setConsent(false);
    track('pwa_installed', {});
    expect(s.calls).toEqual([]);
  });

  it('sends nothing while blocked (a preview session)', () => {
    const s = sink();
    setConsent(true, s);
    setBlocked(() => true);
    track('pwa_installed', {});
    identify('u1', { role: 'mentee' });
    expect(s.calls).toEqual([]);
  });

  it('keeps at most 100 waiting events, the newest', () => {
    for (let i = 0; i < 105; i++) track('session_join_failed', { session_id: String(i) });
    const s = sink();
    setConsent(true, s);
    expect(s.calls).toHaveLength(100);
    expect(s.calls[0]).toEqual(['capture', 'session_join_failed', { session_id: '5' }]);
  });

  it('reset clears the queue and resets the vendor', () => {
    const s = sink();
    setConsent(true, s);
    reset();
    expect(s.calls).toEqual([['reset']]);
  });
});

describe('replay scopes (PRD 30: booking records while its modal is open)', () => {
  it('tells listeners when a scope opens and closes, once each', async () => {
    const { onReplayScope, replayScopeActive, setReplayScope, resetForTests } =
      await import('./track');
    resetForTests();
    const heard = vi.fn();
    const stop = onReplayScope(heard);
    expect(replayScopeActive()).toBe(false);
    setReplayScope('booking', true);
    setReplayScope('booking', true);
    expect(replayScopeActive()).toBe(true);
    expect(heard).toHaveBeenCalledTimes(1);
    setReplayScope('booking', false);
    expect(replayScopeActive()).toBe(false);
    expect(heard).toHaveBeenCalledTimes(2);
    stop();
    setReplayScope('booking', true);
    expect(heard).toHaveBeenCalledTimes(2);
    resetForTests();
  });
});
