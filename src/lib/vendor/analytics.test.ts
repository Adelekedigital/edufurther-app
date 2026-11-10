import type { CaptureResult } from 'posthog-js';

const ph = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
  startSessionRecording: vi.fn(),
  stopSessionRecording: vi.fn(),
  persistence: { remove: vi.fn() },
  sessionPersistence: { remove: vi.fn() },
  status: 'pending' as 'granted' | 'denied' | 'pending',
  get_explicit_consent_status() {
    return this.status;
  },
}));
vi.mock('posthog-js', () => ({ default: ph }));
const recorderLoaded = vi.hoisted(() => vi.fn());
vi.mock('posthog-js/dist/recorder', () => {
  recorderLoaded();
  return {};
});

import {
  NO_REPLAY_ATTR,
  beforeSend,
  loadAnalytics,
  resetVendorForTests,
  vendorConfig,
} from './analytics';

beforeEach(() => {
  vi.clearAllMocks();
  ph.status = 'pending';
  resetVendorForTests();
});

describe('the PostHog seam', () => {
  it('loads once, through our own path, with typed events only', async () => {
    const a = await loadAnalytics('phc_key', '/ingest');
    const b = await loadAnalytics('phc_key', '/ingest');
    expect(a).toBe(b);
    expect(ph.init).toHaveBeenCalledTimes(1);
    const [key, config] = ph.init.mock.calls[0]!;
    expect(key).toBe('phc_key');
    expect(config).toMatchObject({
      api_host: '/ingest',
      cookieless_mode: 'on_reject',
      opt_out_capturing_by_default: true,
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_exceptions: false,
      capture_performance: false,
      disable_session_recording: true,
      disable_surveys: true,
      disable_external_dependency_loading: true,
      advanced_disable_flags: true,
      cross_subdomain_cookie: false,
      enable_recording_console_log: false,
      session_recording: { maskAllInputs: true, blockSelector: `[${NO_REPLAY_ATTR}]` },
    });
  });

  it('cookieless: captures, never identifies, never records', async () => {
    const v = await loadAnalytics('k', '/ingest');
    v.sink.capture('$pageview', { route: '/explore' });
    v.sink.identify('u1', { role: 'mentee' });
    v.setReplay(true);
    expect(ph.capture).toHaveBeenCalledWith('$pageview', { route: '/explore' });
    expect(ph.identify).not.toHaveBeenCalled();
    expect(ph.startSessionRecording).not.toHaveBeenCalled();
  });

  it('accept opts in, then identify and replay work', async () => {
    const v = await loadAnalytics('k', '/ingest');
    v.setMode('identified');
    expect(ph.opt_in_capturing).toHaveBeenCalledWith({ captureEventName: false });
    v.sink.identify('u1', { role: 'mentor' });
    expect(ph.identify).toHaveBeenCalledWith('u1', { role: 'mentor' });
    v.setReplay(true);
    v.setReplay(true);
    // The recorder is our own import, loaded on the first start only.
    await vi.waitFor(() => expect(ph.startSessionRecording).toHaveBeenCalledWith(true));
    expect(ph.startSessionRecording).toHaveBeenCalledTimes(1);
    expect(recorderLoaded).toHaveBeenCalledTimes(1);
    v.setReplay(false);
    expect(ph.stopSessionRecording).toHaveBeenCalledTimes(1);
  });

  it('replay turned off while the recorder loads never starts', async () => {
    const { wrap } = await import('./analytics');
    let done!: () => void;
    const slow = () => new Promise<void>((r) => (done = r));
    const v = wrap(ph as never, slow);
    v.setMode('identified');
    v.setReplay(true);
    v.setReplay(false);
    done();
    await new Promise((r) => setTimeout(r, 0));
    expect(ph.startSessionRecording).not.toHaveBeenCalled();
  });

  it('withdrawing in the session stops replay, resets the id and goes cookieless', async () => {
    const v = await loadAnalytics('k', '/ingest');
    v.setMode('identified');
    v.setReplay(true);
    v.setMode('cookieless');
    expect(ph.stopSessionRecording).toHaveBeenCalled();
    expect(ph.reset).toHaveBeenCalled();
    expect(ph.opt_out_capturing).toHaveBeenCalled();
    expect(ph.persistence.remove).toHaveBeenCalled();
    expect(ph.sessionPersistence.remove).toHaveBeenCalled();
    v.sink.identify('u1', { role: 'mentee' });
    expect(ph.identify).not.toHaveBeenCalled();
  });

  it('an Accept PostHog kept from an earlier visit is undone by a decline since', async () => {
    ph.status = 'granted';
    const v = await loadAnalytics('k', '/ingest');
    v.setMode('cookieless');
    expect(ph.reset).toHaveBeenCalledTimes(1);
  });

  it('log-out while cookieless writes nothing', async () => {
    const v = await loadAnalytics('k', '/ingest');
    v.sink.reset();
    expect(ph.reset).not.toHaveBeenCalled();
  });

  it('log-out resets and keeps an accepted answer', async () => {
    const v = await loadAnalytics('k', '/ingest');
    v.setMode('identified');
    ph.opt_in_capturing.mockClear();
    v.sink.reset();
    expect(ph.reset).toHaveBeenCalled();
    expect(ph.opt_in_capturing).toHaveBeenCalledTimes(1);
  });

  it('before_send drops query strings and invite codes', () => {
    const e = {
      uuid: '1',
      event: '$pageview',
      properties: { $current_url: 'https://a.test/invite/abc?viewAs=x', route: '/invite/[code]' },
      $set: { $initial_pathname: '/invite/abc' },
    } as unknown as CaptureResult;
    expect(beforeSend(e)).toMatchObject({
      properties: { $current_url: 'https://a.test/invite/[code]' },
      $set: { $initial_pathname: '/invite/[code]' },
    });
    expect(beforeSend(null)).toBeNull();
    expect(vendorConfig('/ingest').before_send).toBe(beforeSend);
  });
});
