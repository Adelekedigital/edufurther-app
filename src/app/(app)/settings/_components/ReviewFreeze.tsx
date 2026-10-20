'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
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
 * Frozen while the tab is showing (a save the freeze refused): the banner is
 * said through the always-present LiveRegion (a region inserted with its text
 * is often skipped) and takes focus, since the save bar that held it is gone.
 * On load it's just page content, read in order.
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
  const [said, setSaid] = useState<{ text: string; id: number } | null>(null);
  const was = useRef(frozen);
  useEffect(() => {
    if (frozen && !was.current) {
      setSaid((s) => ({ text: `${C.lead} ${words}`, id: (s?.id ?? 0) + 1 }));
      banner.current?.focus();
    }
    was.current = frozen;
  }, [frozen, words]);
  const region = <LiveRegion message={said} />;
  if (!frozen)
    return (
      <>
        {region}
        {children}
      </>
    );
  const href = supportHref(
    { name: profile?.name ?? '', email: profile?.email ?? '', mentor: true },
    { subject: C.subject, body: C.body },
  );
  return (
    <div className={styles.stack}>
      {region}
      <div ref={banner} tabIndex={-1} className={styles.banner}>
        <Notice tone="subtle" icon="lock" title={C.lead} live={false}>
          {words} {C.mistake} <a href={href}>{C.contact}</a>
        </Notice>
      </div>
      {children}
    </div>
  );
}
