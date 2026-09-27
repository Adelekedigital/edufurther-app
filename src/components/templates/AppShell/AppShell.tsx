'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ButtonLink } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { OfflineBanner } from '@/components/molecules/OfflineBanner/OfflineBanner';
import { cx } from '@/lib/utils/cx';
import styles from './AppShell.module.css';

type NavItem = { label: string; href: string; icon: IconName };

/** Mentee navigation (design AppShell role=mentee). Routes belong to their own screens. */
const MENTEE_NAV: NavItem[] = [
  { label: 'Home', href: '/', icon: 'home' },
  { label: 'Explore', href: '/explore', icon: 'explore' },
  { label: 'Bookings', href: '/bookings', icon: 'schedule' },
  { label: 'Messages', href: '/messages', icon: 'chat' },
  { label: 'Settings', href: '/settings', icon: 'settings' },
];
/** Bottom tabs: max 4 — the first three, then "More" (design PWA pass). */
const PRIMARY_TABS = ['Home', 'Explore', 'Bookings'];
/**
 * Prefetch is off until the other screens exist: Next 16 holds prefetch streams
 * open for routes that 404, which never lets the page reach network idle.
 * Turn it back on (delete prefetch={PREFETCH}) once Home/Bookings/Messages/Settings ship.
 */
const PREFETCH = false;

type AppShellProps = {
  /** Label of the current section, e.g. "Explore". */
  active: string;
  /** Guests get the public header (Log in / Get started) and no navigation. */
  guest: boolean;
  offline: boolean;
  children: ReactNode;
};

/**
 * App chrome: header, side rail (≥768px) or bottom tabs (<768px), offline banner.
 * Not yet here, pending auth: the account menu and notifications (see
 * docs/handoff/explore-design-request.md → build notes).
 */
export function AppShell({ active, guest, offline, children }: AppShellProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  const extra = MENTEE_NAV.filter((n) => !PRIMARY_TABS.includes(n.label));
  const moreActive = extra.some((n) => n.label === active);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMoreOpen(false);
        moreRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>
      {offline && <OfflineBanner />}
      <header className={styles.header}>
        <Link href="/" prefetch={PREFETCH} className={styles.logo} aria-label="EduFurther home">
          <Image src="/brand/edufurther-logo-full.png" alt="" width={180} height={24} priority />
        </Link>
        {guest && (
          <div className={styles.guestActions}>
            <ButtonLink href="/login" variant="secondary-outlined">
              Log in
            </ButtonLink>
            <ButtonLink href="/signup">Get started</ButtonLink>
          </div>
        )}
      </header>

      <div className={styles.body}>
        {!guest && (
          <nav aria-label="Main" className={styles.rail}>
            <ul className={styles.railList}>
              {MENTEE_NAV.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    prefetch={PREFETCH}
                    className={styles.railItem}
                    aria-current={n.label === active ? 'page' : undefined}
                  >
                    <span className={styles.railIcon}>
                      <Icon name={n.icon} size={20} />
                    </span>
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <main id="main" className={cx(styles.main, guest && styles.mainGuest)}>
          {children}
        </main>
      </div>

      {!guest && (
        <nav aria-label="Main" className={styles.tabs}>
          {MENTEE_NAV.filter((n) => PRIMARY_TABS.includes(n.label)).map((n) => (
            <Link
              key={n.href}
              href={n.href}
              prefetch={PREFETCH}
              className={styles.tab}
              aria-current={n.label === active ? 'page' : undefined}
            >
              <span className={styles.tabIcon}>
                <Icon name={n.icon} size={22} />
              </span>
              {n.label}
            </Link>
          ))}
          <button
            ref={moreRef}
            type="button"
            className={styles.tab}
            aria-expanded={moreOpen}
            aria-controls="more-sheet"
            data-current={moreActive || undefined}
            onClick={() => setMoreOpen((o) => !o)}
          >
            <span className={styles.tabIcon}>
              <Icon name="menu" size={22} />
            </span>
            More
          </button>
        </nav>
      )}

      {moreOpen && (
        <>
          <div className={styles.sheetScrim} aria-hidden onClick={() => setMoreOpen(false)} />
          <div id="more-sheet" className={styles.sheet}>
            <span className={styles.handle} aria-hidden />
            <ul className={styles.sheetList}>
              {extra.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    prefetch={PREFETCH}
                    className={styles.sheetItem}
                    aria-current={n.label === active ? 'page' : undefined}
                    onClick={() => setMoreOpen(false)}
                  >
                    <Icon name={n.icon} size={20} />
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
