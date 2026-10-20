'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Notice } from '@/components/molecules/Notice/Notice';
import { supportHref } from '@/components/organisms/SecuritySettings/SecuritySettings';
import { useMenteeProfile } from '@/lib/api/data/settings';
import { FREEZE_COPY as C } from '@/lib/copy/mentorSettings';
import styles from './ReviewFreeze.module.css';

/**
 * A mentor tab while the application is in review (Mentor Settings.dc.html
 * reviewFreeze=on): the banner above the tab's content, its "Contact us" a
 * request to support with the account's name and email (the /me Settings
 * already reads). Not frozen, only the content.
 *
 * Frozen while the tab is showing (a save the freeze refused): the save bar
 * that held focus is gone, so focus moves to the banner, which is read as it
 * lands (one voice: no live region saying it too). On load it's page
 * content, read in order; the Notice is never a live region itself.
 */
export function ReviewFreeze({
  frozen,
  userId,
  words,
  children,
}: {
  frozen: boolean;
  userId: string;
  /** What can still change on this tab. */
  words: string;
  children: ReactNode;
}) {
  const { profile } = useMenteeProfile(frozen ? userId : null);
  const banner = useRef<HTMLDivElement>(null);
  const was = useRef(frozen);
  useEffect(() => {
    if (frozen && !was.current) banner.current?.focus();
    was.current = frozen;
  }, [frozen]);
  if (!frozen) return <>{children}</>;
  const href = supportHref(
    { name: profile?.name ?? '', email: profile?.email ?? '', mentor: true },
    { subject: C.subject, body: C.body },
  );
  return (
    <div className={styles.stack}>
      <div ref={banner} tabIndex={-1} className={styles.banner}>
        <Notice tone="subtle" icon="lock" title={C.lead} live={false}>
          {words} {C.mistake} <a href={href}>{C.contact}</a>
        </Notice>
      </div>
      {children}
    </div>
  );
}
