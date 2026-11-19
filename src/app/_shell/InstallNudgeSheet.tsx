'use client';

import { InstallSheet } from '@/components/templates/InstallSheet/InstallSheet';
import { INSTALL_COPY } from '@/lib/copy/install';
import { acceptInstall, closeInstall } from '@/lib/pwa/installNudge';
import type { InstallNudge } from '@/lib/pwa/installPrompt';

export function leadFor(n: InstallNudge): string {
  if (n.trigger === 'booking') return INSTALL_COPY.lead.booking(n.name);
  if (n.trigger === 'message') return INSTALL_COPY.lead.message(n.name);
  if (n.trigger === 'onboarding' && !n.mentor) return INSTALL_COPY.lead.onboarding;
  return INSTALL_COPY.lead.general;
}

/**
 * The open install sheet, wired to its buttons: InstallNudgeRoot's lazy part,
 * so the sheet, its copy and its actions load only when it opens.
 */
export function InstallNudgeSheet({ nudge }: { nudge: InstallNudge }) {
  return (
    <InstallSheet
      platform={nudge.platform}
      lead={leadFor(nudge)}
      onAccept={() => void acceptInstall()}
      onClose={closeInstall}
    />
  );
}
