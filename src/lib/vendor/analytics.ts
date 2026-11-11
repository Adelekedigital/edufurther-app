import type { CaptureResult, PostHog, PostHogConfig } from 'posthog-js';
import type { PersonProperties } from '@/lib/analytics/events';
import { scrubProperties } from '@/lib/analytics/scrub';
import type { Sink } from '@/lib/analytics/track';

/**
 * PostHog enters the app here and nowhere else (checkBoundaries.vendorSeams).
 * It is loaded with a dynamic import, only once analytics may run (flag on,
 * key set, not a preview), so it is never in the first page's JavaScript.
 *
 * Consent (PRD 30): `cookieless_mode: 'on_reject'` with opted out by default,
 * so before an answer and after a decline PostHog counts without cookies or
 * storage (a server-side hash, no identify, no replay). Accept opts in:
 * persistence, identify, and replay where the app turns it on. Typed events
 * only, plus page leaves for Web Analytics: autocapture, automatic page views, heatmaps, dead and rage clicks,
 * exceptions, web vitals, surveys, tours and experiments are all off.
 */

/** Marks a part of the page replay never records (intake answers, message dialogs). */
export const NO_REPLAY_ATTR = 'data-no-replay';

export type VendorMode = 'cookieless' | 'identified';

export type VendorAnalytics = {
  /** Events go here in either mode; identify only lands once identified. */
  sink: Sink;
  setMode: (mode: VendorMode) => void;
  /** Replay on this route; only ever on while identified. */
  setReplay: (on: boolean) => void;
};

/** Every address property scrubbed before it leaves (no query string, no invite code). */
export function beforeSend(event: CaptureResult | null): CaptureResult | null {
  if (!event) return null;
  return {
    ...event,
    properties: scrubProperties(event.properties ?? {}),
    ...(event.$set ? { $set: scrubProperties(event.$set) } : {}),
    ...(event.$set_once ? { $set_once: scrubProperties(event.$set_once) } : {}),
  };
}

export function vendorConfig(apiHost: string): Partial<PostHogConfig> {
  return {
    api_host: apiHost,
    cookieless_mode: 'on_reject',
    opt_out_capturing_by_default: true,
    person_profiles: 'identified_only',
    autocapture: false,
    capture_pageview: false,
    // Web Analytics' bounce rate and time on page; pairs with our own $pageview.
    capture_pageleave: true,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    rageclick: false,
    capture_exceptions: false,
    capture_performance: false,
    disable_surveys: true,
    disable_product_tours: true,
    disable_conversations: true,
    disable_web_experiments: true,
    // No feature flags are used: no /flags call on every page.
    advanced_disable_flags: true,
    // PostHog never injects a script of its own: the recorder is our own
    // dynamic import (loadRecorder), bundled and served by this app.
    disable_external_dependency_loading: true,
    // Host-only until the landing site reads PostHog's cookie too.
    cross_subdomain_cookie: false,
    // Off until the app starts it on an allowed route or scope, after Accept.
    disable_session_recording: true,
    enable_recording_console_log: false,
    session_recording: {
      maskAllInputs: true,
      blockSelector: `[${NO_REPLAY_ATTR}]`,
      recordHeaders: false,
      recordBody: false,
    },
    before_send: beforeSend,
  };
}

/** The session recorder, fetched the first time replay starts (it registers itself with PostHog). */
export function loadRecorder(): Promise<unknown> {
  return import('posthog-js/dist/recorder');
}

/** Wraps a started PostHog in our interface: the app never calls the SDK itself. */
export function wrap(
  ph: PostHog,
  recorder: () => Promise<unknown> = loadRecorder,
): VendorAnalytics {
  let recorderReady: Promise<boolean> | null = null;
  // An earlier visit's Accept is kept in PostHog's own storage: start from it,
  // so a decline given since (here or on the landing site) still resets.
  let mode: VendorMode =
    ph.get_explicit_consent_status() === 'granted' ? 'identified' : 'cookieless';
  let replaying = false;
  const stopReplay = () => {
    if (!replaying) return;
    replaying = false;
    ph.stopSessionRecording();
  };
  return {
    sink: {
      capture: (event, props) => {
        ph.capture(event, props);
      },
      identify: (userId: string, props: PersonProperties) => {
        // Cookieless: no identifier may be stored or linked.
        if (mode === 'identified') ph.identify(userId, props);
      },
      reset: () => {
        // Cookieless has no id on the device to reset (and a reset would write one).
        if (mode !== 'identified') return;
        stopReplay();
        ph.reset();
        // reset() returns PostHog to its default (opted out); keep the accepted answer.
        ph.opt_in_capturing({ captureEventName: false });
      },
    },
    setMode: (next) => {
      if (next === mode) return;
      mode = next;
      if (next === 'identified') {
        ph.opt_in_capturing({ captureEventName: false });
      } else {
        // Withdrawn in this session: replay stops, the id goes, and back to
        // the default (opted out, so cookieless) with nothing stored.
        stopReplay();
        ph.reset();
        // reset() mints a fresh id and keeps storing it: opting out switches
        // PostHog to cookieless (storage off), then its cookie and storage go,
        // so a withdrawal leaves no identifier on the device. Only the
        // vendor's own "declined" marker stays.
        ph.opt_out_capturing();
        ph.persistence?.remove();
        ph.sessionPersistence?.remove();
      }
    },
    setReplay: (on) => {
      if (on && mode === 'identified' && !replaying) {
        replaying = true;
        recorderReady ??= recorder().then(
          () => true,
          () => {
            recorderReady = null;
            return false;
          },
        );
        void recorderReady.then((ok) => {
          // Still wanted once the recorder arrived (it may have been turned off meanwhile).
          // `true`: start whatever the project's sampling or triggers say; the app decides.
          if (ok && replaying && mode === 'identified') ph.startSessionRecording(true);
          else if (!ok) replaying = false;
        });
      } else if (!on) stopReplay();
    },
  };
}

let loading: Promise<VendorAnalytics> | null = null;

/** Loads and starts PostHog once per page; later calls get the same instance. */
export function loadAnalytics(key: string, apiHost: string): Promise<VendorAnalytics> {
  loading ??= import('posthog-js').then(({ default: posthog }) => {
    posthog.init(key, vendorConfig(apiHost));
    return wrap(posthog);
  });
  return loading;
}

/** Tests only. */
export function resetVendorForTests() {
  loading = null;
}
