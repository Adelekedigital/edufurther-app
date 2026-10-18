'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/atoms/Icon/Icon';
import { ALREADY_APPROVED_TOAST } from '@/lib/copy/mentorApplication';
import styles from './ApprovedToast.module.css';

/** Mentor Dashboard v2.dc.html: the toast stays 4s. */
export const APPROVED_TOAST_MS = 4000;

/**
 * "You're already approved" (Mentor Dashboard v2.dc.html `?toast=approved`):
 * the approval email opened again after the approved screen was seen. The
 * status region is always mounted, so the words are read out when they land;
 * the parameter is dropped from the address so a reload doesn't repeat it.
 */
export function ApprovedToast() {
  const params = useSearchParams();
  const path = usePathname();
  const router = useRouter();
  const asked = params.get('toast') === 'approved';
  // Once per arrival: closing doesn't reopen it while the address catches up.
  const [phase, setPhase] = useState<'idle' | 'open' | 'done'>('idle');
  if (asked && phase === 'idle') setPhase('open');
  const open = phase === 'open';

  useEffect(() => {
    if (!asked) return;
    const rest = new URLSearchParams(params.toString());
    rest.delete('toast');
    const q = rest.toString();
    router.replace(q ? `${path}?${q}` : path, { scroll: false });
  }, [asked, params, path, router]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setPhase('done'), APPROVED_TOAST_MS);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <div role="status" className={styles.region}>
      {open && (
        <div className={styles.toast}>
          <Icon name="verified" size={18} className={styles.icon} />
          {ALREADY_APPROVED_TOAST}
        </div>
      )}
    </div>
  );
}
