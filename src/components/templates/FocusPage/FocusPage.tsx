import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cx } from '@/lib/utils/cx';
import { Icon } from '@/components/atoms/Icon/Icon';
import { OfflineBanner } from '@/components/molecules/OfflineBanner/OfflineBanner';
import styles from './FocusPage.module.css';

type FocusPageProps = {
  /** Where the header's link goes, and what it says ("Go to Bookings"). */
  back: { href: string; label: string };
  offline?: boolean;
  /** 1080px instead of 720px: the lobby with its aside beside it (`lobbySplit`). */
  wide?: boolean;
  children: ReactNode;
};

/**
 * Session Join.dc.html's frame: a slim header (logo and one way back) over a
 * grey page, and **no nav rail**. For a page someone opens to do one thing
 * right now, so nothing else competes with it. A deliberate exception to
 * "every app screen renders inside AppShell" (design-divergence.md).
 */
export function FocusPage({ back, offline, wide, children }: FocusPageProps) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link
          href={back.href}
          prefetch={false}
          className={styles.logo}
          aria-label={`EduFurther: ${back.label}`}
        >
          <Image src="/brand/edufurther-logo-full.png" alt="" width={180} height={24} priority />
        </Link>
        <Link href={back.href} prefetch={false} className={styles.back}>
          {back.label}
          <Icon name="arrow_forward" size={16} />
        </Link>
      </header>
      {offline && <OfflineBanner />}
      <main className={cx(styles.main, wide && styles.wide)}>{children}</main>
    </div>
  );
}
