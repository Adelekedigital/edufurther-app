'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '@/lib/utils/cx';
import { FOCUSABLE, useFocusTrap } from '@/lib/utils/useFocusTrap';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { IconButton } from '@/components/atoms/IconButton/IconButton';
import type { SheetChrome } from '@/types/ui';
import styles from './ModalShell.module.css';

type ModalShellProps = {
  title: string;
  subtitle?: string;
  /** sm 400 / md 480 / lg 560 / xl 880 (design Modal.dc.html). */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Header glyph in a ringed disc (Modal.dc.html `icon`). Centred modal only. */
  icon?: IconName;
  /** Colours the icon: success for "published", danger for a destructive confirm. */
  tone?: 'default' | 'danger' | 'success';
  onClose: () => void;
  children: ReactNode;
  /**
   * Render as a full-screen sheet instead: `sheet` replaces the title row,
   * `children` scroll, and `footer` stays pinned to the bottom. The caller
   * decides (it knows the viewport and owns the step state).
   */
  sheet?: SheetChrome;
  /**
   * With `sheet`: a bottom sheet rather than the whole screen — anchored to the
   * bottom edge, only as tall as its content (capped), the dimmed page still
   * visible behind it (CancelModal.dc.html `sheet contained`). Without `sheet`
   * it means nothing, so the full-screen flows keep the default.
   */
  contained?: boolean;
  footer?: ReactNode;
  /** A confirm: `alertdialog`, so it is announced as needing an answer. */
  alert?: boolean;
  /** The × is off (a confirm whose request is running). Centred modal only. */
  closeDisabled?: boolean;
  /**
   * Under 768px (Modal.dc.html `mobile`): `full`, the whole screen (default),
   * or `sheet`, a bottom sheet as tall as its content that keeps the centred
   * modal's header, icon included. Centred modal only.
   */
  mobile?: 'full' | 'sheet';
  /**
   * Id of an element in the body that says what the dialog is about (a
   * confirm's warning), for its accessible description. Centred modal only;
   * with a subtitle, both are read, subtitle first.
   */
  describedBy?: string;
};

/**
 * Dialog frame: overlay, title, close. The dialog behaviour itself — focus in,
 * Tab kept inside, Escape, scroll lock, focus back — is `useFocusTrap`, shared
 * with the Bookings detail sheet. Full-screen under 768px.
 * The backdrop does NOT close it: a booking in progress holds typed answers, and
 * so does a cancellation's reason — a stray tap must not discard either.
 */
export function ModalShell({
  title,
  subtitle,
  size = 'md',
  icon,
  tone = 'default',
  onClose,
  children,
  sheet,
  contained = false,
  footer,
  alert = false,
  closeDisabled = false,
  mobile = 'full',
  describedBy,
}: ModalShellProps) {
  const titleId = useId();
  const subId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, onClose);

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
      <div className={cx(styles.root, styles.sheetRoot, contained && styles.containedRoot)}>
        <div className={cx(styles.overlay, contained && styles.overlaySheet)} aria-hidden />
        <div
          ref={dialogRef}
          role={alert ? 'alertdialog' : 'dialog'}
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={sheet.caption ? subId : undefined}
          tabIndex={-1}
          className={cx(styles.sheet, contained && styles.contained)}
        >
          {/* Decorative: the sheet is dismissed by the leading button, not by dragging. */}
          {contained && <span className={styles.grabber} aria-hidden />}
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

  const phoneSheet = mobile === 'sheet';
  return createPortal(
    <div className={cx(styles.root, phoneSheet && styles.phoneSheetRoot)}>
      <div className={styles.overlay} aria-hidden />
      <div
        ref={dialogRef}
        role={alert ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={
          [subtitle ? subId : null, describedBy].filter(Boolean).join(' ') || undefined
        }
        tabIndex={-1}
        className={cx(styles.dialog, styles[size], phoneSheet && styles.phoneSheet)}
      >
        {phoneSheet && <span className={cx(styles.grabber, styles.phoneGrabber)} aria-hidden />}
        <IconButton
          icon="close"
          aria-label="Close"
          className={styles.close}
          onClick={onClose}
          disabled={closeDisabled}
        />
        <div className={cx(styles.header, icon && styles.withIcon)}>
          {icon && (
            <span className={cx(styles.icon, styles[`icon-${tone}`])}>
              <Icon name={icon} size={24} />
            </span>
          )}
          <div className={styles.titles}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            {subtitle && (
              <p id={subId} className={styles.subtitle}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {children}
        {footer}
      </div>
    </div>,
    document.body,
  );
}
