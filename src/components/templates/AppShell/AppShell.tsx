'use client';

import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ButtonLink } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { AccountMenu, type AccountMenuItem } from '@/components/molecules/AccountMenu/AccountMenu';
import { OfflineBanner } from '@/components/molecules/OfflineBanner/OfflineBanner';
import { cx } from '@/lib/utils/cx';
import styles from './AppShell.module.css';

/** Rail group: `daily` above the divider, `setup` below (design sidebar=grouped). */
type NavItem = { label: string; href: string; icon: IconName; group: 'daily' | 'setup' };

/**
 * Mentee navigation (design AppShell role=mentee). Messages is held until it's
 * built (product 2026-09-30). Routes belong to their own screens.
 */
const MENTEE_NAV: NavItem[] = [
  { label: 'Home', href: '/', icon: 'home', group: 'daily' },
  { label: 'Explore', href: '/explore', icon: 'explore', group: 'daily' },
  { label: 'Bookings', href: '/bookings', icon: 'schedule', group: 'daily' },
  { label: 'Settings', href: '/settings', icon: 'settings', group: 'setup' },
];
/** Mentor navigation (design AppShell role=mentor, sidebar=grouped, integrationIn=nav). */
const MENTOR_NAV: NavItem[] = [
  { label: 'Home', href: '/', icon: 'home', group: 'daily' },
  { label: 'Bookings', href: '/bookings', icon: 'schedule', group: 'daily' },
  { label: 'Calendar', href: '/calendar', icon: 'calendar_month', group: 'daily' },
  { label: 'Sessions', href: '/session-types', icon: 'event_note', group: 'setup' },
  { label: 'Integration', href: '/integrations', icon: 'power', group: 'setup' },
  { label: 'Settings', href: '/settings', icon: 'settings', group: 'setup' },
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

type Counts = Partial<Record<string, { count: number; label: string }>>;

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
  account?: {
    avatar: ComponentProps<typeof AccountMenu>['avatar'];
    items: AccountMenuItem[];
    /**
     * Count badges by nav label, e.g. Bookings: requests awaiting a response.
     * `label` is read after the item's name ("Bookings, 2 requests awaiting…").
     */
    counts?: Counts;
  };
  offline: boolean;
  children: ReactNode;
};

/**
 * App chrome: grouped side rail (≥768px) or header + bottom tabs (<768px), offline banner.
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
  const counts = account?.counts ?? {};
  const daily = items.filter((n) => n.group === 'daily');
  const setup = items.filter((n) => n.group === 'setup');

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
      {/* Desktop members get the offline strip over the content instead (below),
          so it never pushes the full-height rail's avatar off screen. */}
      {offline && (
        <div className={cx(member && styles.offlineTop)}>
          <OfflineBanner />
        </div>
      )}
      {/* Desktop members get the brand in the rail and a bar over the content
          (design logoIn=sidebar); guests, the pending state and phones keep this. */}
      <header className={cx(styles.header, member && styles.headerMember)}>
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
            <Link
              href="/"
              prefetch={PREFETCH}
              className={styles.railLogo}
              aria-label="EduFurther home"
            >
              <Image src="/brand/edufurther-mark-swoosh.png" alt="" width={48} height={20} />
            </Link>
            <div className={styles.railScroll}>
              <RailList items={daily} active={active} counts={counts} />
              {daily.length > 0 && setup.length > 0 && (
                <span className={styles.railDivider} aria-hidden />
              )}
              <RailList items={setup} active={active} counts={counts} />
            </div>
            {account && <AccountMenu avatar={account.avatar} items={account.items} />}
          </nav>
        )}
        <div className={styles.column}>
          {member && <div className={styles.contentBar} />}
          {member && offline && (
            <div className={styles.offlineColumn}>
              <OfflineBanner />
            </div>
          )}
          <main id="main" className={cx(styles.main, guest && styles.mainGuest)}>
            {children}
          </main>
        </div>
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
                <CountBadge count={counts[n.label]} />
              </span>
              {n.label}
              <CountLabel count={counts[n.label]} />
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

function RailList({ items, active, counts }: { items: NavItem[]; active: string; counts: Counts }) {
  if (items.length === 0) return null;
  return (
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
              <CountBadge count={counts[n.label]} />
            </span>
            {n.label}
            <CountLabel count={counts[n.label]} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Red count pill on a nav icon (design `badges`): "9+" above nine, none at 0. */
function CountBadge({ count }: { count?: { count: number } }) {
  if (!count || count.count <= 0) return null;
  return (
    <span className={styles.badge} aria-hidden>
      {count.count > 9 ? '9+' : count.count}
    </span>
  );
}

/** The count in words, for the link's name (the pill itself is hidden). */
function CountLabel({ count }: { count?: { count: number; label: string } }) {
  if (!count || count.count <= 0) return null;
  return <span className="sr-only">, {count.label}</span>;
}
