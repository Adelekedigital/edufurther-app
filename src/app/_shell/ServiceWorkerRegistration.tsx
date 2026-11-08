'use client';

import { useEffect } from 'react';
import { setUpServiceWorker } from '@/lib/utils/serviceWorker';

/**
 * Mounted once in the root layout: registers the service worker after the
 * page has loaded (production only), or removes it when switched off
 * (lib/utils/serviceWorker, ADR 0011). Renders nothing.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    setUpServiceWorker();
  }, []);
  return null;
}
