'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { listenForOpenRequests, setUpServiceWorker } from '@/lib/utils/serviceWorker';

/**
 * Mounted once in the root layout: registers the service worker after the
 * page has loaded (production only), or removes it when switched off
 * (lib/utils/serviceWorker, ADR 0011), and opens a tapped notification's
 * screen when the worker asks. Renders nothing.
 */
export function ServiceWorkerRegistration() {
  const router = useRouter();
  useEffect(() => {
    setUpServiceWorker();
  }, []);
  // A notification tap with the app already open: its screen, in the app.
  useEffect(() => listenForOpenRequests((path) => router.push(path)), [router]);
  return null;
}
