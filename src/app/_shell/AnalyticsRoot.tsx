'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ConsentBanner } from '@/components/organisms/ConsentBanner/ConsentBanner';
import {
  acquisitionSent,
  markAcquisitionSent,
  readArrival,
  rememberArrival,
  setAcquisitionPersistence,
  storedAcquisition,
} from '@/lib/analytics/acquisition';
import { effectiveConsent, readSignedOut } from '@/lib/analytics/consent';
import { consentStore } from '@/lib/analytics/consentStore';
import { personProperties, rememberMigrated } from '@/lib/analytics/identity';
import {
  analyticsMode,
  bannerShown,
  replayAllowed,
  type AnalyticsMode,
} from '@/lib/analytics/mode';
import { routeOf } from '@/lib/analytics/scrub';
import {
  identify,
  onReplayScope,
  replayScopeActive,
  setBlocked,
  setConsent,
  track,
} from '@/lib/analytics/track';
import {
  recordAcquisition,
  saveConsent,
  useAnalyticsConsent,
  type SignupRead,
} from '@/lib/api/data/analyticsConsent';
import { usePreview } from '@/lib/api/data/preview';
import { focusPageHeading } from './RouteFocusManager';
import { isPreviewing } from '@/lib/api/data/previewStore';
import { useViewer } from '@/lib/api/data/viewer';
import {
  ANALYTICS_LIVE,
  ANALYTICS_PATH,
  CONSENT_BANNER_LIVE,
  POSTHOG_KEY,
} from '@/lib/config/analytics';
import { useHydrated } from '@/lib/utils/useHydrated';
import { loadAnalytics, type VendorAnalytics } from '@/lib/vendor/analytics';

/** An arrival older than this isn't the account's sign-up (the held arrival's own lifetime). */
const NEW_ACCOUNT_MS = 30 * 24 * 60 * 60_000;

/**
 * Nothing is sent while any of these holds: the flag is off, no key, a
 * preview is active (PRD 27: nothing as anyone), or tests.
 */
export function analyticsBlocked(): boolean {
  return !ANALYTICS_LIVE || !POSTHOG_KEY || isPreviewing() || process.env.NODE_ENV === 'test';
}

/**
 * PRD 30's page-level half, mounted once at the root (Providers) so it covers
 * every page, guest pages included: the consent banner, the vendor in the
 * mode consent allows, one `$pageview` per navigation, replay on onboarding
 * and while the booking modal is open, identify for a known member, and the
 * account's arrival sent once. The banner is presentational; everything it
 * fetches is here.
 */
export function AnalyticsRoot() {
  const pathname = usePathname();
  const viewer = useViewer();
  const preview = usePreview();
  const previewing = preview.sessionId !== null;
  const hydrated = useHydrated();
  const qc = useQueryClient();
  const member = viewer.kind === 'member' ? viewer : null;
  const memberId = member?.id ?? null;
  const { answer: stored, here, choose } = useAnalyticsConsent(memberId);

  // An answer from before the last log-out here was someone else's (shared
  // device): unanswered, unless given on this page.
  // A member's answer is the newest of this device's and the account's; one
  // given on this page always wins.
  const [signedOutAt] = useState(() => readSignedOut());
  const r = effectiveConsent({
    stored,
    here,
    signedOutAt,
    server: member?.analyticsConsent,
    member: member !== null,
  });
  const answer = r.answer;

  // Not identified until we know who is signed in (their account may disagree).
  const viewerKnown = viewer.kind === 'member' || viewer.kind === 'guest';
  const wanted: AnalyticsMode = analyticsMode({
    analyticsOn: ANALYTICS_LIVE,
    bannerOn: CONSENT_BANNER_LIVE,
    keySet: POSTHOG_KEY !== '',
    previewing,
    answer,
  });
  const mode: AnalyticsMode = wanted === 'identified' && !viewerKnown ? 'cookieless' : wanted;

  useEffect(() => setBlocked(analyticsBlocked), []);

  // The vendor, in the mode consent allows; disconnected when off.
  const [loaded, setLoaded] = useState<{ v: VendorAnalytics; mode: AnalyticsMode } | null>(null);
  const loadedRef = useRef<VendorAnalytics | null>(null);
  useEffect(() => {
    if (mode === 'off') {
      // A preview started (or a flag went): stop replay, disconnect, drop the queue.
      setConsent(false);
      loadedRef.current?.setReplay(false);
      return;
    }
    let live = true;
    void loadAnalytics(POSTHOG_KEY, ANALYTICS_PATH)
      .then((v) => {
        if (!live) return;
        v.setMode(mode);
        setConsent(true, v.sink);
        loadedRef.current = v;
        setLoaded({ v, mode });
      })
      .catch(() => {
        // Blocked by the browser or an extension: the app works without it.
      });
    return () => {
      live = false;
    };
  }, [mode]);

  // Only the vendor in the mode in force; nothing while off.
  const vendor = mode === 'off' ? null : loaded;

  // Device storage only once identified; a withdrawal removes what was written.
  const wasIdentified = useRef(false);
  useEffect(() => {
    if (mode === 'identified') {
      wasIdentified.current = true;
      setAcquisitionPersistence(true);
    } else if (mode === 'cookieless' && wasIdentified.current) {
      wasIdentified.current = false;
      setAcquisitionPersistence(false);
    }
  }, [mode]);

  // One page view per navigation, from here only (capture_pageview is off).
  const viewed = useRef<string | null>(null);
  useEffect(() => {
    if (!pathname || mode === 'off' || viewed.current === pathname) return;
    viewed.current = pathname;
    track('$pageview', { route: routeOf(pathname) });
  }, [pathname, mode]);

  // Replay only identified: on the onboarding routes, and while booking is open.
  const scoped = useSyncExternalStore(onReplayScope, replayScopeActive, () => false);
  useEffect(() => {
    if (!vendor || !pathname) return;
    const on =
      mode === 'identified' && vendor.mode === 'identified' && (replayAllowed(pathname) || scoped);
    vendor.v.setReplay(on);
  }, [vendor, mode, pathname, scoped]);

  // Where this visit came from, held until sign-in (never in a preview).
  useEffect(() => {
    if (!ANALYTICS_LIVE || isPreviewing()) return;
    const a = readArrival(
      window.location.pathname,
      window.location.search,
      document.referrer,
      window.location.hostname,
    );
    if (a) rememberArrival(a);
  }, []);

  // Signed in: the arrival goes to the account once, and its answer feeds identify.
  const [signup, setSignup] = useState<SignupRead | null>(null);
  const sentFor = useRef<string | null>(null);
  const createdAt = member?.createdAt;
  useEffect(() => {
    if (!ANALYTICS_LIVE || !memberId || previewing || sentFor.current === memberId) return;
    sentFor.current = memberId;
    if (acquisitionSent(memberId)) return;
    const created = createdAt ? Date.parse(createdAt) : NaN;
    if (!Number.isNaN(created) && Date.now() - created > NEW_ACCOUNT_MS) {
      // An older account: this device's arrival isn't how it signed up.
      markAcquisitionSent(memberId);
      return;
    }
    void recordAcquisition(storedAcquisition()).then((res) => {
      if (!res.ok) {
        sentFor.current = null;
        return;
      }
      markAcquisitionSent(memberId);
      if (res.read) setSignup(res.read);
    });
  }, [memberId, createdAt, previewing]);

  // Remembered for a later failed log-in (never the previewed person's);
  // on the device only once identified.
  const isMigrated = member?.isMigrated;
  useEffect(() => {
    if (ANALYTICS_LIVE && !previewing) rememberMigrated(isMigrated, mode === 'identified');
  }, [isMigrated, previewing, mode]);

  // Identify once identified (track's sink drops it in cookieless mode).
  useEffect(() => {
    if (!member || vendor?.mode !== 'identified') return;
    identify(member.id, personProperties(member, signup));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- by id and role, not every /me refetch
  }, [member?.id, member?.primaryRole, member?.isMigrated, vendor, signup]);

  // A member's device and account agree on the answer: the newest wins. A
  // device answer from before the last log-out is never sent to an account.
  const synced = useRef<string | null>(null);
  const { push, write } = r;
  useEffect(() => {
    if (!CONSENT_BANNER_LIVE || !memberId || previewing || synced.current === memberId) return;
    synced.current = memberId;
    if (write && answer) consentStore.adopt(answer);
    if (push && answer) void saveConsent(answer, qc);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per account, on what was known then
  }, [memberId, previewing]);

  // While shown, focus never lands behind the card (scroll-padding-bottom).
  const bannerRef = useRef<HTMLElement>(null);
  const known = viewerKnown;
  const show =
    hydrated &&
    known &&
    bannerShown({
      analyticsOn: ANALYTICS_LIVE,
      bannerOn: CONSENT_BANNER_LIVE,
      previewing,
      answer,
    });
  useEffect(() => {
    const el = bannerRef.current;
    if (!show || !el) return;
    const root = document.documentElement;
    const measure = () => {
      const covered = Math.max(0, window.innerHeight - el.getBoundingClientRect().top);
      root.style.setProperty('--ef-consent-h', `${Math.ceil(covered)}px`);
    };
    measure();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
      root.style.removeProperty('--ef-consent-h');
    };
  }, [show]);

  // Answering removes the banner, and with it the focused button: focus goes
  // to the page heading, never to <body> (a keyboard user keeps their place).
  const answeredHere = useRef(false);
  const answerFromBanner = (granted: boolean) => {
    answeredHere.current = !!bannerRef.current?.contains(document.activeElement);
    void choose(granted);
  };
  useEffect(() => {
    if (show || !answeredHere.current) return;
    answeredHere.current = false;
    focusPageHeading();
  }, [show]);

  if (!show) return null;
  return (
    <ConsentBanner
      ref={bannerRef}
      onAccept={() => answerFromBanner(true)}
      onDecline={() => answerFromBanner(false)}
    />
  );
}
