'use client';

import { useEffect, useRef, useState } from 'react';
import { Snackbar } from '@/components/molecules/Snackbar/Snackbar';
import { SocialLinksCard } from '@/components/organisms/SocialLinksCard/SocialLinksCard';
import { ConfirmDialog } from '@/components/templates/ConfirmDialog/ConfirmDialog';
import { useMyLinks, useRemoveSocial, useSaveSocial, type SocialRow } from '@/lib/api/data/links';
import { SOCIAL_LINKS_COPY as C } from '@/lib/copy/socialLinks';
import { markLabel } from '@/lib/utils/socialLinks';

/** How long a toast stays (the design's flash: 5s). */
const TOAST_MS = 5000;

/**
 * Settings › Social links for a mentor (Mentor Settings.dc.html `isSocial`,
 * linksScope=limited). Each link saves as it's added, changed or removed, so
 * there's never anything for the save bar (and no handle for the tab guard).
 */
export function LinksPanel({ userId }: { userId: string }) {
  const links = useMyLinks(userId);
  const saving = useSaveSocial(userId);
  const removing = useRemoveSocial(userId);
  const [saveTries, setSaveTries] = useState(0);
  const [pending, setPending] = useState<SocialRow | null>(null);

  const [toast, setToast] = useState<{ text: string; at: number } | null>(null);
  const said = useRef(0);
  const say = (text: string) => setToast({ text, at: ++said.current });
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  // The control that had focus may be gone (a removed row, the closed form):
  // focus "Add link", else the heading, rather than the page (WCAG 2.4.3).
  const heading = useRef<HTMLHeadingElement>(null);
  const add = useRef<HTMLButtonElement>(null);
  const [refocus, setRefocus] = useState(0);
  useEffect(() => {
    if (!refocus) return;
    const at = document.activeElement;
    if (at && at !== document.body) return;
    (add.current?.isConnected ? add.current : heading.current)?.focus();
  }, [refocus]);

  return (
    <>
      <SocialLinksCard
        status={links.status}
        rows={links.rows ?? []}
        onRetry={links.retry}
        saving={saving.isPending}
        saveError={saving.error}
        saveErrorKey={saveTries}
        onSave={async (s) => {
          setToast(null);
          try {
            await saving.save(s);
          } catch {
            setSaveTries((n) => n + 1);
            return false;
          }
          saving.reset();
          say(s.id ? C.updated : C.added);
          setRefocus((n) => n + 1);
          return true;
        }}
        onRemove={(row) => {
          removing.reset();
          setPending(row);
        }}
        headingRef={heading}
        addRef={add}
      />
      {pending && (
        <ConfirmDialog
          title={C.removeTitle}
          subtitle={C.removeSub(markLabel(pending.mark))}
          icon="link_off"
          mobile="sheet"
          keepLabel={C.keep}
          confirmLabel={C.remove}
          pendingLabel={C.removing}
          pending={removing.isPending}
          error={removing.error}
          onKeep={() => setPending(null)}
          onConfirm={async () => {
            try {
              await removing.remove(pending);
            } catch {
              return;
            }
            setPending(null);
            say(C.removed);
            setRefocus((n) => n + 1);
          }}
        />
      )}
      <Snackbar message={toast?.text ?? null} stamp={toast?.at} />
    </>
  );
}
