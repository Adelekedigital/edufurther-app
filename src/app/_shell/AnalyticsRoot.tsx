'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { components } from '@/lib/api/generated/schema';
import { ConsentBanner } from '@/components/organisms/ConsentBanner/ConsentBanner';
import {
  acquisitionSent,
  markAcquisitionSent,
  readArrival,
  rememberArrival,
  storedAcquisition,
} from '@/lib/analytics/acquisition';
import { fromServer, reconcile } from '@/lib/analytics/consent';
import { consentStore } from '@/lib/analytics/consentStore';
import { personProperties, rememberMigrated } from '@/lib/analytics/identity';
import {
  analyticsMode,
  bannerShown,
  replayAllowed,
  type AnalyticsMode,
} from '@/lib/analytics/mode';
import { routeOf } from '@/lib/analytics/scrub';
import { identify, setBlocked, setConsent, track } from '@/lib/analytics/track';
import {
  recordAcquisition,
  saveConsent,
  useAnalyticsConsent,
} from '@/lib/api/data/analyticsConsent';
import { usePreview } from '@/lib/api/data/preview';
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

type AcquisitionRead = components['schemas']['AcquisitionRead'];

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
 * mode consent allows, one `$pageview` per navigation, replay on the allowed
 * routes, identify for a known member, and the account's arrival sent once.
 * The banner is presentational; everything it fetches is here.
 */
export function AnalyticsRoot() {
  const pathname = usePathname();
  const viewer = useViewer();
  const preview = usePreview();
  const previewing = preview.sessionId !== null;
  const hydrated = useHydrated();
  const member = viewer.kind === 'member' ? viewer : null;
  const { answer: device, choose } = useAnalyticsConsent(member?.id ?? null);
  const serverConsent = member?.analyticsConsent;
  // A member's answer is the newest of this device's and the account's.
  const answer = member ? reconcile(device, fromServer(serverConsent)).answer : device;

  const mode: AnalyticsMode = analyticsMode({
    analyticsOn: ANALYTICS_LIVE,
    bannerOn: CONSENT_BANNER_LIVE,
    keySet: POSTHOG_KEY !== '',
    previewing,
    answer,
  });

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

  // One page view per navigation, from here only (capture_pageview is off).
  const viewed = useRef<string | null>(null);
  useEffect(() => {
    if (!pathname || mode === 'off' || viewed.current === pathname) return;
    viewed.current = pathname;
    track('$pageview', { route: routeOf(pathname) });
  }, [pathname, mode]);

  // Replay only identified, only on onboarding and booking routes.
  useEffect(() => {
    if (!vendor || !pathname) return;
    vendor.v.setReplay(vendor.mode === 'identified' && replayAllowed(pathname));
  }, [vendor, pathname]);

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
  const [signup, setSignup] = useState<AcquisitionRead | null>(null);
  const sentFor = useRef<string | null>(null);
  const memberId = member?.id ?? null;
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
    void recordAcquisition(storedAcquisition()).then((r) => {
      if (!r.ok) {
        sentFor.current = null;
        return;
      }
      markAcquisitionSent(memberId);
      if (r.read) setSignup(r.read);
    });
  }, [memberId, createdAt, previewing]);

  // Remembered for a later failed log-in (never the previewed person's).
  const isMigrated = member?.isMigrated;
  useEffect(() => {
    if (ANALYTICS_LIVE && !previewing) rememberMigrated(isMigrated);
  }, [isMigrated, previewing]);

  // Identify once identified (track's sink drops it in cookieless mode).
  useEffect(() => {
    if (!member || vendor?.mode !== 'identified') return;
    identify(member.id, personProperties(member, signup));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- by id and role, not every /me refetch
  }, [member?.id, member?.primaryRole, member?.isMigrated, vendor, signup]);

  // A member's device and account agree on the answer: the newest wins.
  const synced = useRef<string | null>(null);
  useEffect(() => {
    if (!CONSENT_BANNER_LIVE || !memberId || previewing || synced.current === memberId) return;
    synced.current = memberId;
    const server = fromServer(serverConsent);
    const r = reconcile(consentStore.get(), server);
    if (r.write && r.answer) consentStore.adopt(r.answer);
    if (r.push && r.answer) void saveConsent(r.answer);
  }, [memberId, serverConsent, previewing]);

  // A signed-in visitor waits for /me: their account may already have answered.
  const known = viewer.kind === 'member' || viewer.kind === 'guest';
  const show =
    hydrated &&
    known &&
    bannerShown({
      analyticsOn: ANALYTICS_LIVE,
      bannerOn: CONSENT_BANNER_LIVE,
      previewing,
      answer,
    });
  if (!show) return null;
  return <ConsentBanner onAccept={() => void choose(true)} onDecline={() => void choose(false)} />;
}
