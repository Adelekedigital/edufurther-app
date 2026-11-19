'use client';

import { useEffect } from 'react';
import { lazyPart } from '@/components/molecules/LazyPart/lazyPart';
import { captureInstallPrompt, setOpen, useInstallOpen } from '@/lib/pwa/installPrompt';

// The sheet, its copy and its buttons load when it opens, not with every page
// (performance budget, 350kB first-load JS). A failed load closes it, uncounted.
const InstallNudgeSheet = lazyPart(
  () => import('./InstallNudgeSheet').then((m) => m.InstallNudgeSheet),
  { close: () => void setOpen(null) },
);

/**
 * The install nudge's one host, mounted once in the root layout so it covers
 * onboarding too: keeps the browser's install prompt from the first page
 * (lib/pwa/installPrompt), and draws the sheet while one is open. When a
 * moment shows is the lazy half's (lib/pwa/installNudge).
 */
export function InstallNudgeRoot() {
  const open = useInstallOpen();

  // Listening starts when the module loads; this call is a no-op unless released.
  useEffect(() => {
    captureInstallPrompt();
  }, []);

  if (!open) return null;
  return <InstallNudgeSheet nudge={open} />;
}
