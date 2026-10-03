'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import type { AppError } from '@/types/mentor';
import { BookingDetails } from '../BookingDetails/BookingDetails';
import { useFocusTrap } from '@/lib/utils/useFocusTrap';
import styles from './BookingDetailsPanel.module.css';

type PanelProps = Omit<Parameters<typeof BookingDetails>[0], 'titleId' | 'booking'> & {
  /** The sheet replaces the page on a phone; the aside sits beside the list. */
  asSheet: boolean;
  /** Null while a `?booking=` link is still being fetched, or if it failed. */
  booking: Parameters<typeof BookingDetails>[0]['booking'] | null;
  /** The booking is on its way: a link opened cold, with no row to read from. */
  isLoading?: boolean;
  /** It could not be fetched. */
  error?: AppError | null;
  retry?: () => void;
};

/**
 * The details panel in its frame (Bookings.dc.html).
 *
 * The aside is not a dialog: it sits in the page beside the list, the list
 * stays usable behind it, and trapping focus in it would strand the keyboard.
 * The sheet covers the screen, so it is one — and takes the app's dialog
 * behaviour whole (`useFocusTrap`), rather than a second opinion about Escape.
 */
export function BookingDetailsPanel({ asSheet, isLoading, error, retry, ...details }: PanelProps) {
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  // A link opened cold has no row to read from, so the panel owns all four
  // states itself — a blank frame while it loads, and a sayable failure.
  const body = !details.booking ? (
    <Fallback
      titleId={titleId}
      isLoading={!!isLoading}
      error={error}
      retry={retry}
      onClose={details.onClose}
    />
  ) : (
    <BookingDetails {...details} booking={details.booking} titleId={titleId} />
  );

  if (!asSheet) {
    return (
      <Aside titleId={titleId} bookingId={details.booking?.id ?? null}>
        {body}
      </Aside>
    );
  }
  return <Sheet ref={sheetRef} titleId={titleId} body={body} onClose={details.onClose} />;
}

function Fallback({
  titleId,
  isLoading,
  error,
  retry,
  onClose,
}: {
  titleId: string;
  isLoading: boolean;
  error?: AppError | null;
  retry?: () => void;
  onClose: () => void;
}) {
  return (
    <div className={styles.fallback}>
      <div className={styles.fallbackHead}>
        <h2 id={titleId} className={styles.fallbackTitle}>
          Booking details
        </h2>
        <button type="button" aria-label="Close details" onClick={onClose} className={styles.close}>
          <Icon name="close" size={20} />
        </button>
      </div>
      {isLoading ? (
        <div className={styles.skeleton} aria-hidden="true">
          <Skeleton height="40px" radius="md" />
          <Skeleton height="96px" radius="md" />
          <Skeleton height="64px" radius="md" />
        </div>
      ) : (
        <div className={styles.problem} role="alert">
          <p className={styles.problemText}>
            {error?.kind === 'notFound'
              ? 'That booking isn’t there any more.'
              : error?.kind === 'offline'
                ? 'You’re offline. Try again when you reconnect.'
                : 'We couldn’t load this booking.'}
          </p>
          {retry && error?.kind !== 'notFound' && (
            <Button variant="secondary-outlined" size="medium" onClick={retry}>
              Try again
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The desktop aside. Not a dialog — the list beside it stays usable — so it
 * does not trap focus. It does move focus in when it opens and give it back
 * when it closes: without that, "See details" from a row menu leaves a screen
 * reader where it was, with no sign anything happened.
 */
function Aside({
  titleId,
  bookingId,
  children,
}: {
  titleId: string;
  bookingId: string | null;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const panel = ref.current;
    opener.current = document.activeElement as HTMLElement | null;
    panel?.focus();
    return () => {
      // Only if focus is still inside: the person may have clicked elsewhere.
      if (panel?.contains(document.activeElement)) opener.current?.focus?.();
    };
    // On open and whenever it swaps to another booking, not on every render.
  }, [bookingId]);
  return (
    <aside
      ref={ref}
      id="booking-details"
      aria-labelledby={titleId}
      tabIndex={-1}
      className={styles.aside}
    >
      {children}
    </aside>
  );
}

function Sheet({
  ref,
  titleId,
  body,
  onClose,
}: {
  ref: React.RefObject<HTMLDivElement | null>;
  titleId: string;
  body: React.ReactNode;
  onClose: () => void;
}) {
  useFocusTrap(ref, onClose);
  return createPortal(
    <div
      ref={ref}
      id="booking-details"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className={styles.sheet}
    >
      {body}
    </div>,
    document.body,
  );
}
