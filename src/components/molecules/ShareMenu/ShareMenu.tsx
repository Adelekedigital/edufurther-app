'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { ExternalLink } from '@/components/atoms/ExternalLink/ExternalLink';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import type { ShareMethod } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';
import { MENTOR_SHARE_COPY } from '@/lib/copy/mentorShare';
import { useCopyText } from '@/lib/utils/useCopyText';
import { useClampIntoView } from '@/lib/utils/useEdgeFlip';
import styles from './ShareMenu.module.css';

type ShareMenuProps = {
  /** Absolute URL of the profile. */
  url: string;
  /** Mentor's full name, for the message and the email subject. */
  name: string;
  /**
   * When set, the trigger is a labelled secondary-outlined button with this
   * text (the Mentor Dashboard header's "Share profile") instead of the icon
   * button. The menu and its a11y are unchanged.
   */
  triggerLabel?: string;
  /**
   * A line above the options (Mentor Profile.dc.html `shareNote`): who can see
   * the page, for an owner whose profile isn't public. It describes the menu,
   * which is still fully usable.
   */
  note?: string;
  /** After a copy (link or message) lands (Mentor Home marks its Share moves done). */
  onCopied?: () => void;
  /**
   * The viewer's own profile: the message is in the first person, and
   * link_shared `own` (only own shares count toward activation).
   */
  own?: boolean;
} & (
  | {
      /**
       * Controlled from outside (e.g. the owner's "Share your profile" button
       * elsewhere on the page). Both or neither: without onOpenChange a
       * controlled menu could never close.
       */
      open: boolean;
      onOpenChange: (open: boolean) => void;
    }
  | { open?: undefined; onOpenChange?: undefined }
);

type Item = { key: ShareMethod; label: string; icon: IconName } & (
  | { href: string; newTab: boolean; onSelect?: never }
  | { onSelect: () => void; href?: never; newTab?: never }
);

const MENU = MENTOR_SHARE_COPY.menu;
const STATUS = MENTOR_SHARE_COPY.status;

/**
 * Share button + menu (Mentor Profile.dc.html). "Copy link page" is not
 * offered: link pages don't exist (design-divergence.md). Copy message,
 * WhatsApp and X carry a ready-made message (owner, 2026-11-13; not drawn yet). WAI-ARIA menu button,
 * as AccountMenu: arrows / Home / End move, Escape and Tab close, focus
 * returns to the button. Copying is announced ("Link copied").
 */
export function ShareMenu({
  url,
  name,
  triggerLabel,
  note,
  onCopied,
  own = false,
  open: openProp,
  onOpenChange,
}: ShareMenuProps) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOpenState(next);
    onOpenChange?.(next);
  };
  const [status, setStatus] = useState('');
  const { copy } = useCopyText(3000);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  // Hung from the button's right edge, and slid just enough to stay 16px inside
  // the screen when it wouldn't fit (the button mid-row on a phone, or at the
  // start of a short row): it always opens under its own button.
  const shift = useClampIntoView(open, menuRef);
  const menuId = useId();
  const noteId = useId();

  // Where focus goes back to on close: the control that opened the menu (the
  // header icon, or a button elsewhere that opened it from outside).
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const from = document.activeElement;
    returnFocus.current = from instanceof HTMLElement && from !== document.body ? from : null;
    // The menu opens downward; on a short phone it can land under the fixed
    // bottom bar. Scroll just enough to show all of it (scroll-margin in CSS
    // keeps it clear of the bar), then focus without a second jump.
    menuRef.current?.scrollIntoView?.({ block: 'nearest' });
    itemRefs.current[0]?.focus({ preventScroll: true });
  }, [open]);
  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(''), 3000);
    return () => clearTimeout(t);
  }, [status]);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus)
      (returnFocus.current?.isConnected ? returnFocus.current : buttonRef.current)?.focus();
  };

  // Down/Up on the trigger opens the menu (its effect moves focus to item 0).
  const onTriggerKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
    }
  };

  const text = MENTOR_SHARE_COPY.message(own, name);
  const withLink = MENTOR_SHARE_COPY.withLink(own, name, url);
  const enc = encodeURIComponent;

  // useCopyText reads no clipboard API (plain-http previews, some webviews)
  // as a failure, said rather than silent.
  const copyItem =
    (method: 'copy' | 'copy_message', value: string, done: string, failed: string) => () => {
      void copy(value).then((ok) => {
        setStatus(ok ? done : failed);
        if (!ok) return;
        track('link_shared', { kind: 'mentor_profile', method, own });
        onCopied?.();
      });
    };

  const items: Item[] = [
    {
      key: 'copy',
      label: MENU.copyLink,
      icon: 'link',
      onSelect: copyItem('copy', url, STATUS.linkCopied, STATUS.linkFailed),
    },
    {
      key: 'copy_message',
      label: MENU.copyMessage,
      icon: 'content_copy',
      onSelect: copyItem('copy_message', withLink, STATUS.messageCopied, STATUS.messageFailed),
    },
    {
      key: 'whatsapp',
      label: MENU.whatsapp,
      icon: 'chat',
      href: `https://wa.me/?text=${enc(withLink)}`,
      newTab: true,
    },
    {
      key: 'x',
      label: MENU.x,
      icon: 'alternate_email',
      href: `https://x.com/intent/post?text=${enc(text)}&url=${enc(url)}`,
      newTab: true,
    },
    {
      key: 'linkedin',
      label: MENU.linkedin,
      icon: 'share',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
      newTab: true,
    },
    {
      key: 'email',
      label: MENU.email,
      icon: 'mail',
      href: `mailto:?subject=${enc(MENTOR_SHARE_COPY.emailSubject(name))}&body=${enc(withLink)}`,
      newTab: false,
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
      {triggerLabel ? (
        <Button
          ref={buttonRef}
          variant="secondary-outlined"
          size="small"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={() => setOpen(!open)}
          onKeyDown={onTriggerKey}
        >
          {triggerLabel}
        </Button>
      ) : (
        <button
          ref={buttonRef}
          type="button"
          className={styles.trigger}
          aria-label="Share profile"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={() => setOpen(!open)}
          onKeyDown={onTriggerKey}
        >
          <Icon name="ios_share" size={20} />
        </button>
      )}
      {open && <div className={styles.backdrop} aria-hidden onClick={() => close(false)} />}
      {open && (
        // The panel holds the note and the menu: a menu's children can only be
        // its items, so the note sits before it and describes it.
        <div
          ref={menuRef}
          className={styles.menu}
          style={shift ? { transform: `translateX(${shift}px)` } : undefined}
          // A click off the items (the note, the padding) keeps focus on them,
          // so the keys still work.
          onMouseDown={(e) => {
            if (!(e.target as HTMLElement).closest('[role="menuitem"]')) e.preventDefault();
          }}
        >
          {note && (
            <p id={noteId} className={styles.note}>
              {note}
            </p>
          )}
          <div
            id={menuId}
            role="menu"
            aria-label="Share"
            aria-describedby={note ? noteId : undefined}
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
                <ExternalLink
                  key={it.key}
                  ref={ref}
                  role="menuitem"
                  tabIndex={-1}
                  className={styles.item}
                  href={it.href}
                  label={it.label}
                  newTab={it.newTab}
                  onClick={() => {
                    // A share target opened: the intent is the share (the
                    // site's own send is out of our sight).
                    track('link_shared', { kind: 'mentor_profile', method: it.key, own });
                    close(false);
                  }}
                >
                  {body}
                </ExternalLink>
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
        </div>
      )}
      <span role="status" className="sr-only">
        {status}
      </span>
    </div>
  );
}
