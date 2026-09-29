'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ButtonLink } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { AccountMenu, type AccountMenuItem } from '@/components/molecules/AccountMenu/AccountMenu';
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
/** Mentor navigation (design AppShell role=mentor, sidebar=rail, integrationIn=nav). */
const MENTOR_NAV: NavItem[] = [
  { label: 'Home', href: '/', icon: 'home' },
  { label: 'Sessions', href: '/session-types', icon: 'event_note' },
  { label: 'Bookings', href: '/bookings', icon: 'schedule' },
  { label: 'Messages', href: '/messages', icon: 'chat' },
  { label: 'Calendar', href: '/calendar', icon: 'calendar_month' },
  { label: 'Integration', href: '/integrations', icon: 'power' },
  { label: 'Settings', href: '/settings', icon: 'settings' },
];
/** `unknown`: signed in, role not known yet — no items rather than the wrong set. */
const NAV = { mentee: MENTEE_NAV, mentor: MENTOR_NAV, unknown: [] as NavItem[] };
/** Bottom tabs: max 4 — the first three, then "More" (design PWA pass). */
const PRIMARY_TABS = {
  mentee: ['Home', 'Explore', 'Bookings'],
  mentor: ['Home', 'Calendar', 'Bookings'],
  unknown: [] as string[],
};
/**
 * Prefetch is off until the other screens exist: Next 16 holds prefetch streams
 * open for routes that 404, which never lets the page reach network idle.
 * Turn it back on (delete prefetch={PREFETCH}) once Home/Bookings/Messages/Settings
 * and the Log in / Sign up pages ship.
 */
const PREFETCH = false;

type AppShellProps = {
  /** Label of the current section, e.g. "Explore". */
  active: string;
  /**
   * Which navigation a member gets (design `role`; Admin is never shown). From
   * useAppShell; `unknown` while /me is loading, so a mentor never sees the
   * mentee set flash first.
   */
  nav?: 'mentee' | 'mentor' | 'unknown';
  /**
   * guest: public header (Log in / Get started), no navigation.
   * member: rail / tabs and the account menu.
   * pending: the session isn't known yet, so neither set of controls is shown.
   */
  chrome: 'guest' | 'member' | 'pending';
  /** Member account menu (rail foot; appended to the More sheet on phones). */
  account?: { initial: string; items: AccountMenuItem[] };
  offline: boolean;
  children: ReactNode;
};

/**
 * App chrome: header, side rail (≥768px) or bottom tabs (<768px), offline banner.
 * Not yet here: notifications (no backend) — see design-divergence.md.
 */
export function AppShell({
  active,
  nav = 'mentee',
  chrome,
  account,
  offline,
  children,
}: AppShellProps) {
  const guest = chrome === 'guest';
  const member = chrome === 'member';
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  const items = NAV[nav];
  const primary = PRIMARY_TABS[nav];
  // In the design's pick order: mentor tabs read Home, Calendar, Bookings.
  const tabs = primary.flatMap((l) => items.filter((n) => n.label === l));
  const extra = items.filter((n) => !primary.includes(n.label));
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
            <ButtonLink href="/login" prefetch={PREFETCH} variant="secondary-outlined" size="large">
              Log in
            </ButtonLink>
            <ButtonLink href="/signup" prefetch={PREFETCH} size="large">
              Get started
            </ButtonLink>
          </div>
        )}
      </header>

      <div className={styles.body}>
        {member && (
          <nav aria-label="Main" className={styles.rail}>
            <div className={styles.railInner}>
              <ul className={styles.railList}>
                {items.map((n) => (
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
              {account && (
                <div className={styles.railAccount}>
                  <AccountMenu initial={account.initial} items={account.items} />
                </div>
              )}
            </div>
          </nav>
        )}
        <main id="main" className={cx(styles.main, guest && styles.mainGuest)}>
          {children}
        </main>
      </div>

      {guest && (
        // Phones: guest actions move from the header to a sticky bottom bar,
        // always in thumb reach (design AppShell guestNav=float). Desktop keeps
        // them in the header.
        <div className={styles.guestBar}>
          <ButtonLink
            href="/login"
            prefetch={PREFETCH}
            variant="secondary-outlined"
            size="large"
            fullWidth
          >
            Log in
          </ButtonLink>
          <ButtonLink href="/signup" prefetch={PREFETCH} size="large" fullWidth>
            Get started free
          </ButtonLink>
        </div>
      )}

      {member && (
        <nav aria-label="Main" className={styles.tabs}>
          {tabs.map((n) => (
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
          {nav !== 'unknown' && (
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
          )}
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
              {account?.items.map((it) => (
                <li key={it.key}>
                  {it.href !== undefined && !it.external ? (
                    // In-app: next/link, no full reload (review of #61).
                    <Link
                      href={it.href}
                      className={cx(styles.sheetItem, it.danger && styles.sheetDanger)}
                      onClick={() => setMoreOpen(false)}
                    >
                      <Icon name={it.icon} size={20} />
                      {it.label}
                    </Link>
                  ) : it.href !== undefined ? (
                    <a
                      href={it.href}
                      className={cx(styles.sheetItem, it.danger && styles.sheetDanger)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMoreOpen(false)}
                    >
                      <Icon name={it.icon} size={20} />
                      {it.label}
                    </a>
                  ) : (
                    <button
                      type="button"
                      className={cx(styles.sheetItem, it.danger && styles.sheetDanger)}
                      onClick={() => {
                        setMoreOpen(false);
                        it.onSelect();
                      }}
                    >
                      <Icon name={it.icon} size={20} />
                      {it.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
