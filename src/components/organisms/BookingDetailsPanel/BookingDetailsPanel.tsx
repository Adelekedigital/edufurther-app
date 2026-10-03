'use client';

import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BookingDetails } from '../BookingDetails/BookingDetails';
import { useFocusTrap } from '@/lib/utils/useFocusTrap';
import styles from './BookingDetailsPanel.module.css';

type PanelProps = Omit<Parameters<typeof BookingDetails>[0], 'titleId'> & {
  /** The sheet replaces the page on a phone; the aside sits beside the list. */
  asSheet: boolean;
};

/**
 * The details panel in its frame (Bookings.dc.html).
 *
 * The aside is not a dialog: it sits in the page beside the list, the list
 * stays usable behind it, and trapping focus in it would strand the keyboard.
 * The sheet covers the screen, so it is one — and takes the app's dialog
 * behaviour whole (`useFocusTrap`), rather than a second opinion about Escape.
 */
export function BookingDetailsPanel({ asSheet, ...details }: PanelProps) {
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);

  if (!asSheet) {
    return (
      <aside id="booking-details" aria-labelledby={titleId} className={styles.aside}>
        <BookingDetails {...details} titleId={titleId} />
      </aside>
    );
  }
  return <Sheet ref={sheetRef} titleId={titleId} details={details} />;
}

function Sheet({
  ref,
  titleId,
  details,
}: {
  ref: React.RefObject<HTMLDivElement | null>;
  titleId: string;
  details: Omit<Parameters<typeof BookingDetails>[0], 'titleId'>;
}) {
  useFocusTrap(ref, details.onClose);
  return createPortal(
    <div
      ref={ref}
      id="booking-details"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className={styles.sheet}
    >
      <BookingDetails {...details} titleId={titleId} />
    </div>,
    document.body,
  );
}
