'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { reportInstallOnce } from '@/lib/analytics/install';
import { listenForOpenRequests, setUpServiceWorker } from '@/lib/utils/serviceWorker';

/**
 * Mounted once in the root layout: registers the service worker after the
 * page has loaded (production only), or removes it when switched off
 * (lib/utils/serviceWorker, ADR 0011), and opens a tapped notification's
 * screen when the worker asks; counts an install on the first launch of the
 * installed app (PRD 30 `pwa_installed`).
 * Renders nothing.
 */
export function ServiceWorkerRegistration() {
  const router = useRouter();
  useEffect(() => {
    setUpServiceWorker();
  }, []);
  // A notification tap with the app already open: its screen, in the app.
  useEffect(() => listenForOpenRequests((path) => router.push(path)), [router]);
  // Once per app start: the first launch of the installed app on this device
  // counts the install (every platform; lib/analytics/install).
  useEffect(() => {
    reportInstallOnce();
  }, []);
  return null;
}
