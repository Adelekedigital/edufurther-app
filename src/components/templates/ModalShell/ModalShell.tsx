'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '@/lib/utils/cx';
import { IconButton } from '@/components/atoms/IconButton/IconButton';
import type { SheetChrome } from '@/types/ui';
import styles from './ModalShell.module.css';

type ModalShellProps = {
  title: string;
  subtitle?: string;
  /** sm 400 / md 480 / lg 560 / xl 880 (design Modal.dc.html). */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClose: () => void;
  children: ReactNode;
  /**
   * Render as a full-screen sheet instead: `sheet` replaces the title row,
   * `children` scroll, and `footer` stays pinned to the bottom. The caller
   * decides (it knows the viewport and owns the step state).
   */
  sheet?: SheetChrome;
  footer?: ReactNode;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Dialog frame: overlay, title, close. Traps focus, closes on Escape, returns
 * focus to whatever opened it, and locks page scroll. Full-screen under 768px.
 * The backdrop does NOT close it: a booking in progress holds typed answers.
 */
export function ModalShell({
  title,
  subtitle,
  size = 'md',
  onClose,
  children,
  sheet,
  footer,
}: ModalShellProps) {
  const titleId = useId();
  const subId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const first = dialog?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? dialog)?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      // Read the ref on every key: the sheet and the centred modal are different
      // elements, and the caller swaps them when the viewport crosses 768px.
      const live = dialogRef.current;
      if (e.key !== 'Tab' || !live) return;
      const items = Array.from(live.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (items.length === 0) return;
      const firstEl = items[0]!;
      const lastEl = items[items.length - 1]!;
      if (!live.contains(document.activeElement)) {
        e.preventDefault();
        (e.shiftKey ? lastEl : firstEl).focus();
      } else if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      opener?.focus?.();
    };
  }, []);

  // Switching between sheet and centred modal replaces the dialog element, and
  // focus falls to <body>. Put it back inside the new one.
  const isSheet = !!sheet;
  const mountedLayout = useRef(isSheet);
  useEffect(() => {
    if (mountedLayout.current === isSheet) return;
    mountedLayout.current = isSheet;
    const live = dialogRef.current;
    if (live && !live.contains(document.activeElement)) {
      (live.querySelector<HTMLElement>(FOCUSABLE) ?? live).focus();
    }
  }, [isSheet]);

  if (sheet) {
    return createPortal(
      <div className={cx(styles.root, styles.sheetRoot)}>
        <div className={styles.overlay} aria-hidden />
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={sheet.caption ? subId : undefined}
          tabIndex={-1}
          className={styles.sheet}
        >
          {/* div, not <header>/<footer>: inside a dialog those read as duplicate page landmarks (axe). */}
          <div className={styles.sheetHeader}>
            <IconButton
              size="lg"
              icon={sheet.leading.icon}
              aria-label={sheet.leading.label}
              onClick={sheet.leading.onClick}
              disabled={sheet.leading.disabled}
            />
            <div className={styles.sheetTitle}>
              {sheet.caption && (
                <p id={subId} className={styles.sheetCaption}>
                  {sheet.caption}
                </p>
              )}
              <h2 id={titleId} className={styles.sheetHeading}>
                {sheet.heading}
              </h2>
            </div>
            {sheet.showClose ? (
              <IconButton size="lg" icon="close" aria-label="Close" onClick={onClose} />
            ) : (
              <span className={styles.sheetSpacer} aria-hidden />
            )}
          </div>
          {sheet.progress && <div className={styles.sheetProgress}>{sheet.progress}</div>}
          <div className={styles.sheetBody}>{children}</div>
          {footer && <div className={styles.sheetFooter}>{footer}</div>}
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className={styles.root}>
      <div className={styles.overlay} aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subId : undefined}
        tabIndex={-1}
        className={cx(styles.dialog, styles[size])}
      >
        <IconButton icon="close" aria-label="Close" className={styles.close} onClick={onClose} />
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {subtitle && (
            <p id={subId} className={styles.subtitle}>
              {subtitle}
            </p>
          )}
        </div>
        {children}
        {footer}
      </div>
    </div>,
    document.body,
  );
}
