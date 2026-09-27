'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import styles from './ShareMenu.module.css';

type ShareMenuProps = {
  /** Absolute URL of the profile. */
  url: string;
  /** Mentor's name, for the email subject. */
  name: string;
};

type Item = { key: string; label: string; icon: IconName } & (
  { href: string; onSelect?: never } | { onSelect: () => void; href?: never }
);

/**
 * Share button + menu (Mentor Profile.dc.html). "Copy link page" is not
 * offered: link pages don't exist (design-divergence.md). WAI-ARIA menu button,
 * as AccountMenu: arrows / Home / End move, Escape and Tab close, focus
 * returns to the button. Copying is announced ("Link copied").
 */
export function ShareMenu({ url, name }: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const menuId = useId();

  useEffect(() => {
    if (open) itemRefs.current[0]?.focus();
  }, [open]);
  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(''), 3000);
    return () => clearTimeout(t);
  }, [status]);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };

  const items: Item[] = [
    {
      key: 'copy',
      label: 'Copy profile link',
      icon: 'link',
      onSelect: () => {
        navigator.clipboard?.writeText(url).then(
          () => setStatus('Link copied'),
          () => setStatus('Couldn’t copy the link'),
        );
      },
    },
    {
      key: 'linkedin',
      label: 'Share on LinkedIn',
      icon: 'share',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
    {
      key: 'email',
      label: 'Share by email',
      icon: 'mail',
      href: `mailto:?subject=${encodeURIComponent(`${name} on EduFurther`)}&body=${encodeURIComponent(url)}`,
    },
  ];

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
      <button
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        aria-label="Share profile"
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
        <Icon name="ios_share" size={18} />
      </button>
      {open && <div className={styles.backdrop} aria-hidden onClick={() => close(false)} />}
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Share"
          className={styles.menu}
          onKeyDown={onMenuKey}
        >
          {items.map((it, k) => {
            const ref = (el: HTMLElement | null) => {
              itemRefs.current[k] = el;
            };
            const body = (
              <>
                <Icon name={it.icon} size={18} className={styles.itemIcon} />
                {it.label}
              </>
            );
            return it.href !== undefined ? (
              <a
                key={it.key}
                ref={ref}
                role="menuitem"
                tabIndex={-1}
                className={styles.item}
                href={it.href}
                {...(it.key === 'linkedin' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
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
                className={styles.item}
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
      )}
      <span role="status" className="sr-only">
        {status}
      </span>
    </div>
  );
}
