'use client';

import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ButtonLink } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { AccountMenu, type AccountMenuItem } from '@/components/molecules/AccountMenu/AccountMenu';
import { OfflineBanner } from '@/components/molecules/OfflineBanner/OfflineBanner';
import { hasUnsavedChanges, heldLink, discardUnsaved, unsavedLabel } from '@/lib/utils/leaveGuard';
import { fullNavigate } from '@/lib/utils/hardNavigate';
import { CreditsPill } from '@/components/molecules/CreditsPill/CreditsPill';
import { CreditsSummary } from '@/components/molecules/CreditsSummary/CreditsSummary';
import type { CreditsView } from '@/lib/utils/credits';
import type { Access, NavKey } from '@/lib/utils/access';
import { CreditsExplainer } from './CreditsExplainer';
import { LockExplainer } from './LockExplainer';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';
import { cx } from '@/lib/utils/cx';
import styles from './AppShell.module.css';

/** Rail group: `daily` above the divider, `setup` below (design sidebar=grouped). */
type NavItem = { label: string; href: string; icon: IconName; group: 'daily' | 'setup' };

/**
 * A nav item as this viewer gets it (the setup lock, lib/utils/access):
 * `locked` opens the explainer instead of the page, `pill` is Home's "Set up",
 * `name` the accessible name when it isn't the label alone.
 */
type ShownItem = NavItem & {
  locked: boolean;
  pill: boolean;
  name?: string;
  count?: { count: number; label: string };
};

/**
 * Mentee navigation (design AppShell role=mentee). Messages is held until it's
 * built (product 2026-09-30). Routes belong to their own screens.
 *
 * Home links straight to the mentee home — `/home` (`homeFor`) — not to `/`,
 * so in-app Home nav skips the 307 redirect (ADR 0007).
 */
const MENTEE_NAV: NavItem[] = [
  { label: 'Home', href: '/home', icon: 'home', group: 'daily' },
  { label: 'Explore', href: '/explore', icon: 'explore', group: 'daily' },
  { label: 'Bookings', href: '/bookings', icon: 'schedule', group: 'daily' },
  { label: 'Settings', href: '/settings', icon: 'settings', group: 'setup' },
];
/**
 * Mentor navigation (design AppShell role=mentor, sidebar=grouped, integrationIn=nav).
 * Home links straight to `/dashboard` (the mentor home, `homeFor`), not `/`, so
 * in-app Home nav skips the 307 redirect (ADR 0007).
 */
const MENTOR_NAV: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: 'home', group: 'daily' },
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
 * Turn it back on (delete prefetch={PREFETCH}) once Home/Messages/Settings and the
 * Log in / Sign up pages ship. Bookings has (PR 154): it is safe to prefetch — a
 * static shell that fetches in the browser — and the credits explainer's link to
 * it does. This flag is per-nav rather than per-item, so it stays off here.
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
    /** A mentee's monthly credits (pill, menu block, "Your credits"); none for mentors. */
    credits?: CreditsView;
    /** Logout with unsaved changes: the confirm is open (useAppShell). */
    logoutConfirm?: { onKeep: () => void; onLogout: () => void };
  };
  /** The setup lock (accessFor): what is held, and where Home goes meanwhile. */
  access?: Access;
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
  access,
  offline,
  children,
}: AppShellProps) {
  const guest = chrome === 'guest';
  const member = chrome === 'member';
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  // "Your credits": opened from the pill or "How credits work"; focus goes back
  // to whatever opened it.
  const credits = account?.credits;
  const creditsId = useId();
  // Open on the page it was opened on: a new page (AppShell stays mounted
  // across routes) closes it with no effect.
  const pathname = usePathname();
  const [creditsOpenOn, setCreditsOpenOn] = useState<string | null | undefined>(undefined);
  const creditsOpen = creditsOpenOn !== undefined && creditsOpenOn === pathname;
  const creditsOpener = useRef<HTMLElement | null>(null);
  const openCredits = (from: HTMLElement | null) => {
    creditsOpener.current = from;
    setMoreOpen(false);
    setCreditsOpenOn(pathname);
  };
  const closeCredits = () => {
    setCreditsOpenOn(undefined);
    // Crossing the 768px breakpoint while open hides the pill that opened it:
    // fall back to the pill that's showing now.
    const opener = creditsOpener.current;
    const shown = (el: Element | null) => !!el && el.getClientRects().length > 0;
    const pill = [...document.querySelectorAll<HTMLElement>('[data-credits-pill]')].find(shown);
    (opener && !shown(opener) && opener.hasAttribute('data-credits-pill') && pill
      ? pill
      : opener
    )?.focus();
  };
  // Phones: the page behind the sheet doesn't scroll (as under ModalShell).
  useEffect(() => {
    if (!creditsOpen || !window.matchMedia?.('(max-width: 767px)').matches) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = before;
    };
  }, [creditsOpen]);
  // One pill shows at a time (the bar's on desktop, the header's on phones).
  const togglePill = (from: HTMLButtonElement) => {
    if (creditsOpen) return closeCredits();
    openCredits(from);
  };
  const pill = () =>
    credits ? (
      <CreditsPill
        credits={credits}
        expanded={creditsOpen}
        controls={creditsId}
        onClick={togglePill}
      />
    ) : null;
  const counts = account?.counts ?? {};
  // The lock explainer: which item it's about, and where focus goes after.
  const [lock, setLock] = useState<string | null>(null);
  const lockReturn = useRef<HTMLElement | null>(null);
  const openLock = (label: string, from: HTMLElement | null) => {
    // From the More sheet, the item goes with the sheet: come back to More.
    lockReturn.current = from?.closest('#more-sheet') ? moreRef.current : from;
    setMoreOpen(false);
    setLock(label);
  };
  useEffect(() => {
    if (lock !== null || !lockReturn.current) return;
    // After the dialog's own focus return, which can't reach a closed sheet.
    lockReturn.current.focus();
    lockReturn.current = null;
  }, [lock]);
  const items = NAV[nav].map((n) => shownItem(n, access, counts));
  const primary = PRIMARY_TABS[nav];
  // In the design's pick order: mentor tabs read Home, Calendar, Bookings.
  const tabs = primary.flatMap((l) => items.filter((n) => n.label === l));
  const extra = items.filter((n) => !primary.includes(n.label));
  const moreActive = extra.some((n) => n.label === active);
  const daily = items.filter((n) => n.group === 'daily');
  const setup = items.filter((n) => n.group === 'setup');

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      // A dialog over the sheet (e.g. "Discard your changes?") takes Escape
      // itself: the sheet stays, as it does after "Keep editing".
      if (e.key === 'Escape' && !document.querySelector('[aria-modal="true"]')) {
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
        {member && credits && <div className={styles.headerCredits}>{pill()}</div>}
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
              <RailList items={daily} active={active} onLock={openLock} />
              {daily.length > 0 && setup.length > 0 && (
                <span className={styles.railDivider} aria-hidden />
              )}
              <RailList items={setup} active={active} onLock={openLock} />
            </div>
            {account && (
              <AccountMenu
                avatar={account.avatar}
                items={account.items}
                narrow={nav === 'mentor'}
                credits={
                  credits && {
                    view: credits,
                    // The menu has just returned focus to its button: come back there.
                    onHowItWorks: () => openCredits(document.activeElement as HTMLElement),
                  }
                }
              />
            )}
          </nav>
        )}
        <div className={styles.column}>
          {member && <div className={styles.contentBar}>{pill()}</div>}
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
          {tabs.map((n) => {
            const body = (
              <>
                <span className={styles.tabIcon}>
                  <Icon name={n.icon} size={22} />
                  {n.locked ? <LockBadge /> : <CountBadge count={n.count} />}
                </span>
                {/* The pill takes the label's place on a phone tab (design). */}
                {n.pill ? <SetupPill /> : n.label}
              </>
            );
            return n.locked ? (
              <button
                key={n.href}
                type="button"
                className={styles.tab}
                aria-current={n.label === active ? 'page' : undefined}
                aria-label={n.name}
                aria-haspopup="dialog"
                onClick={(e) => openLock(n.label, e.currentTarget)}
              >
                {body}
              </button>
            ) : (
              <Link
                key={n.href}
                href={n.href}
                prefetch={PREFETCH}
                className={styles.tab}
                aria-current={n.label === active ? 'page' : undefined}
                aria-label={n.name}
              >
                {body}
              </Link>
            );
          })}
          {nav !== 'unknown' && (
            <button
              ref={moreRef}
              type="button"
              className={styles.tab}
              aria-expanded={moreOpen}
              aria-controls="more-sheet"
              // Lit while its sheet is open, as well as on one of its pages (design).
              data-current={moreActive || moreOpen || undefined}
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

      {lock !== null && access?.copy && (
        <LockExplainer item={lock} copy={access.copy} onClose={() => setLock(null)} />
      )}
      {creditsOpen && credits && (
        <CreditsExplainer id={creditsId} credits={credits} onClose={closeCredits} />
      )}
      {account?.logoutConfirm && (
        <UnsavedChangesDialog
          what={unsavedLabel()}
          logout
          onKeep={account.logoutConfirm.onKeep}
          onDiscard={account.logoutConfirm.onLogout}
          onSaved={account.logoutConfirm.onLogout}
        />
      )}
      <LinkGuard />

      {moreOpen && (
        <>
          <div className={styles.sheetScrim} aria-hidden onClick={() => setMoreOpen(false)} />
          <div id="more-sheet" className={styles.sheet}>
            <span className={styles.handle} aria-hidden />
            {credits && (
              <CreditsSummary credits={credits} onHowItWorks={() => openCredits(moreRef.current)} />
            )}
            <ul className={styles.sheetList}>
              {extra.map((n) => (
                <li key={n.href}>
                  {n.locked ? (
                    <button
                      type="button"
                      className={styles.sheetItem}
                      aria-current={n.label === active ? 'page' : undefined}
                      aria-label={n.name}
                      aria-haspopup="dialog"
                      onClick={(e) => openLock(n.label, e.currentTarget)}
                    >
                      <Icon name={n.icon} size={20} />
                      <span className={styles.sheetLabel}>{n.label}</span>
                      <span className={styles.sheetLock} aria-hidden>
                        lock
                      </span>
                    </button>
                  ) : (
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
                  )}
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

function RailList({
  items,
  active,
  onLock,
}: {
  items: ShownItem[];
  active: string;
  onLock: (label: string, from: HTMLElement) => void;
}) {
  if (items.length === 0) return null;
  return (
    <ul className={styles.railList}>
      {items.map((n) => {
        const body = (
          <>
            <span className={styles.railIcon}>
              <Icon name={n.icon} size={20} />
              {n.locked ? <LockBadge /> : <CountBadge count={n.count} />}
            </span>
            {n.label}
            {n.pill && <SetupPill />}
          </>
        );
        return (
          <li key={n.href}>
            {n.locked ? (
              <button
                type="button"
                className={styles.railItem}
                aria-current={n.label === active ? 'page' : undefined}
                aria-label={n.name}
                title={n.label}
                aria-haspopup="dialog"
                onClick={(e) => onLock(n.label, e.currentTarget)}
              >
                {body}
              </button>
            ) : (
              <Link
                href={n.href}
                prefetch={PREFETCH}
                className={styles.railItem}
                aria-current={n.label === active ? 'page' : undefined}
                aria-label={n.name}
                title={n.label}
              >
                {body}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The viewer's version of a nav item. Locked: no count (AppShell.dc.html
 * `hasCount: false`) and the reason in its name. Home in setup: the pill, its
 * own name, and the page that finishes setup.
 */
function shownItem(n: NavItem, access: Access | undefined, counts: Counts): ShownItem {
  const copy = access?.copy;
  if (copy && access.locked.has(n.label as NavKey))
    return { ...n, locked: true, pill: false, name: `${n.label}, ${copy.why}` };
  const home = n.label === 'Home';
  const href = home && access?.homeHref ? access.homeHref : n.href;
  if (home && access?.setupPill)
    return { ...n, href, locked: false, pill: true, name: 'Home, finish setting up' };
  const count = counts[n.label];
  return { ...n, href, locked: false, pill: false, count, name: nameWithCount(n.label, count) };
}

/** The lock on a locked item's icon (AppShell.dc.html `locked`). */
function LockBadge() {
  return (
    <span className={styles.lockBadge} aria-hidden>
      lock
    </span>
  );
}

/** Home's "Set up" pill while a mentee finishes onboarding (AppShell.dc.html `setupDot`). */
function SetupPill() {
  return (
    <span className={styles.setupPill} aria-hidden>
      Set up
    </span>
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

/**
 * The link's whole name with its count ("Bookings, 2 requests awaiting your
 * response"), as one label: a hidden text piece gets an extra space in Chrome
 * and can escape the rail's scroll clip. Undefined leaves the visible name.
 */
function nameWithCount(label: string, count?: { count: number; label: string }) {
  return count && count.count > 0 ? `${label}, ${count.label}` : undefined;
}

/**
 * In-app links while a form has unsaved changes (lib/utils/leaveGuard): the
 * click is held and "Discard your changes?" asks first. Discard replays the
 * same click past the guard, so Next follows it as usual. Every app page
 * renders inside AppShell, so every page gets this.
 */
function LinkGuard() {
  const [held, setHeld] = useState<HTMLAnchorElement | null>(null);
  const pass = useRef(false);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (pass.current) {
        pass.current = false;
        return;
      }
      if (!hasUnsavedChanges()) return;
      const a = heldLink(e);
      if (!a) return;
      // Capture phase on document: before Next's Link handler sees it.
      e.preventDefault();
      e.stopPropagation();
      setHeld(a);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  if (!held) return null;
  return (
    <UnsavedChangesDialog
      what={unsavedLabel()}
      onKeep={() => setHeld(null)}
      onDiscard={follow}
      onSaved={follow}
    />
  );

  /**
   * Follow the held link, after Discard or once the form saved. Saved, the
   * form is clean only once it re-renders, so it stands down now either way:
   * the replayed click (or a full load) mustn't be held a second time.
   */
  function follow() {
    const a = held!;
    setHeld(null);
    discardUnsaved();
    if (a.isConnected) {
      // click() dispatches synchronously; the flag can't outlive it.
      pass.current = true;
      try {
        a.click();
      } finally {
        pass.current = false;
      }
    } else if (new URL(a.href).origin === window.location.origin) {
      // The link is gone (re-rendered): a full load instead, same site only.
      fullNavigate(a.href);
    }
  }
}
