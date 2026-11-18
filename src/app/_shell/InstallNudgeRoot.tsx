'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { lazyPart } from '@/components/molecules/LazyPart/lazyPart';
import { INSTALL_COPY } from '@/lib/copy/install';
import {
  acceptInstall,
  captureInstallPrompt,
  closeInstall,
  showPending,
  useInstallNudge,
  type InstallNudge,
} from '@/lib/pwa/installNudge';

// Loads when it opens, not with every page (performance budget, 350kB first-load JS).
const InstallSheet = lazyPart(
  () => import('@/components/templates/InstallSheet/InstallSheet').then((m) => m.InstallSheet),
  { close: (p) => p.onClose() },
);

/** A beat after the moment, so the screen's own "sent" state is seen first. */
export const SHOW_DELAY_MS = 1_200;

/** Any dialog open: the nudge never covers or stacks on one. */
const OPEN_DIALOG = '[aria-modal="true"]';

export function leadFor(n: InstallNudge): string {
  if (n.trigger === 'booking') return INSTALL_COPY.lead.booking(n.name);
  if (n.trigger === 'message') return INSTALL_COPY.lead.message(n.name);
  if (n.trigger === 'onboarding' && !n.mentor) return INSTALL_COPY.lead.onboarding;
  return INSTALL_COPY.lead.general;
}

/**
 * The install nudge's one host (lib/pwa/installNudge), mounted once in the
 * root layout so it covers onboarding too: keeps the browser's install prompt
 * from the first page, and shows a queued moment's sheet once no dialog is
 * open (a booking's modal closes first). Onboarding's moment waits for the
 * next screen, so the matches reveal is never covered.
 */
export function InstallNudgeRoot() {
  const pathname = usePathname();
  const { open, pending } = useInstallNudge();

  // Listening starts when the module loads; this call is a no-op unless released.
  useEffect(() => {
    captureInstallPrompt();
  }, []);

  const ready = !!pending && (pending.trigger !== 'onboarding' || pathname !== pending.from);
  useEffect(() => {
    if (!ready) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let watcher: MutationObserver | null = null;
    const watch = () => {
      watcher ??= new MutationObserver(attempt);
      watcher.observe(document.body, { childList: true, subtree: true });
    };
    function attempt() {
      if (timer !== undefined || document.querySelector(OPEN_DIALOG)) return;
      watcher?.disconnect();
      timer = setTimeout(() => {
        timer = undefined;
        // A dialog opened meanwhile: wait for it to close too.
        if (document.querySelector(OPEN_DIALOG)) watch();
        else showPending();
      }, SHOW_DELAY_MS);
    }
    watch();
    attempt();
    return () => {
      clearTimeout(timer);
      watcher?.disconnect();
    };
  }, [ready, pending]);

  if (!open) return null;
  return (
    <InstallSheet
      platform={open.platform}
      lead={leadFor(open)}
      onAccept={() => void acceptInstall()}
      onClose={closeInstall}
    />
  );
}
