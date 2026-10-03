'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { CreditsSummary } from '@/components/molecules/CreditsSummary/CreditsSummary';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import type { CoverKey } from '@/lib/utils/cover';
import type { CreditsView } from '@/lib/utils/credits';
import { cx } from '@/lib/utils/cx';
import styles from './AccountMenu.module.css';

export type AccountMenuItem = {
  key: string;
  label: string;
  icon: IconName;
  /** Destructive (Logout): red, after a divider (AppShell.dc.html). */
  danger?: boolean;
} & (
  { href: string; external?: boolean; onSelect?: never } | { onSelect: () => void; href?: never }
);

type AccountMenuProps = {
  /**
   * The viewer as the button shows them: their photo (cropped at `focus`), else
   * their initial on their cover colour's deep tone, as on their profile.
   */
  avatar: {
    initial: string;
    src?: string | null;
    focus?: { x: number; y: number } | null;
    cover: CoverKey;
  };
  items: AccountMenuItem[];
  /**
   * A mentee's credits, at the top of the menu (AppShell.dc.html creditMenu).
   * Outside the role="menu" list: it's text and a link, not a menu item.
   */
  credits?: { view: CreditsView; onHowItWorks: () => void };
};

/**
 * Account avatar + menu at the foot of the side rail (AppShell.dc.html: 36px
 * circle on the viewer's colour, menu 212px wide, 36px items, Logout red after
 * a divider). The photo is ours: the design draws the initial only.
 * WAI-ARIA menu button: arrows / Home / End move, Escape and Tab close, focus
 * returns to the button.
 */
export function AccountMenu({ avatar, items, credits }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const menuId = useId();

  useEffect(() => {
    if (open) itemRefs.current[0]?.focus();
  }, [open]);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };

  const onMenuKey = (e: KeyboardEvent) => {
    const els = itemRefs.current.filter((x): x is HTMLElement => !!x);
    const i = els.indexOf(document.activeElement as HTMLElement);
    const to = (n: number) => {
      e.preventDefault();
      els[(n + els.length) % els.length]?.focus();
    };
    if (e.key === 'ArrowDown') to(i + 1);
    else if (e.key === 'ArrowUp') to(i - 1);
    else if (e.key === 'Home') to(0);
    else if (e.key === 'End') to(els.length - 1);
    else if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
    } else if (e.key === 'Tab') close(false);
  };

  return (
    <div className={styles.root}>
      {open && <div className={styles.backdrop} aria-hidden onClick={() => close(false)} />}
      {open && (
        <div className={styles.menu}>
          {credits && (
            <CreditsSummary
              credits={credits.view}
              onHowItWorks={() => {
                close(true);
                credits.onHowItWorks();
              }}
            />
          )}
          <div id={menuId} role="menu" aria-label="Account" onKeyDown={onMenuKey}>
            {items.map((it, k) => {
              const cls = cx(styles.item, it.danger && styles.danger);
              const ref = (el: HTMLElement | null) => {
                itemRefs.current[k] = el;
              };
              const body = (
                <>
                  <Icon name={it.icon} size={16} />
                  {it.label}
                </>
              );
              // In-app links go through next/link (no full reload: the session and
              // cache survive, review of #61); external ones open a new tab.
              return it.href !== undefined && !it.external ? (
                <Link
                  key={it.key}
                  ref={ref}
                  role="menuitem"
                  tabIndex={-1}
                  className={cls}
                  href={it.href}
                  onClick={() => close(false)}
                >
                  {body}
                </Link>
              ) : it.href !== undefined ? (
                <a
                  key={it.key}
                  ref={ref}
                  role="menuitem"
                  tabIndex={-1}
                  className={cls}
                  href={it.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => close(false)}
                >
                  {body}
                </a>
              ) : (
                <button
                  key={it.key}
                  ref={ref}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  className={cls}
                  onClick={() => {
                    close(true);
                    it.onSelect();
                  }}
                >
                  {body}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <button
        ref={buttonRef}
        type="button"
        className={styles.avatar}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <Avatar
          size="nav"
          initials={avatar.initial}
          tone={avatar.cover}
          src={avatar.src}
          focus={avatar.focus}
          alt=""
        />
      </button>
    </div>
  );
}
