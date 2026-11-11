'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { track } from '@/lib/analytics/track';
import { listenForOpenRequests, setUpServiceWorker } from '@/lib/utils/serviceWorker';

/**
 * Mounted once in the root layout: registers the service worker after the
 * page has loaded (production only), or removes it when switched off
 * (lib/utils/serviceWorker, ADR 0011), and opens a tapped notification's
 * screen when the worker asks; counts an install (PRD 30 `pwa_installed`).
 * Renders nothing.
 */
export function ServiceWorkerRegistration() {
  const router = useRouter();
  useEffect(() => {
    setUpServiceWorker();
  }, []);
  // A notification tap with the app already open: its screen, in the app.
  useEffect(() => listenForOpenRequests((path) => router.push(path)), [router]);
  // The browser's own install event, heard here only: the cleanup keeps it to
  // one listener through Strict Mode's second run and any remount.
  useEffect(() => {
    const installed = () => track('pwa_installed', {});
    window.addEventListener('appinstalled', installed);
    return () => window.removeEventListener('appinstalled', installed);
  }, []);
  return null;
}
