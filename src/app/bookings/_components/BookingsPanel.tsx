'use client';

import type { ReactNode } from 'react';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { BookingList } from '@/components/organisms/BookingList/BookingList';
import { BookingRow } from '@/components/organisms/BookingRow/BookingRow';
import type { AppError } from '@/types/mentor';
import type { Booking, BookingTab } from '@/types/booking';
import { emptyFor } from './empties';
import { PAGE_SIZE } from './useRevealed';
import styles from './BookingsScreen.module.css';

type BookingsPanelProps = {
  tab: BookingTab;
  bookings: Booking[];
  isLoading: boolean;
  error: AppError | null;
  retry: () => void;
  timeZone: string;
  isMentor: boolean;
  /** A History filter is on: the empty state says so rather than "nothing yet". */
  filtered?: boolean;
  /** How many rows are revealed. */
  shown: number;
  showMore: () => void;
  /** Unknown on History, which pages by cursor and gets no total from the API. */
  total?: number;
  /** More exists beyond what is loaded (History). */
  hasMore?: boolean;
  isLoadingMore?: boolean;
  /** The next page failed: said under the button, where the click was. */
  loadMoreError?: AppError | null;
  /** The heading above the box, where the design has one. */
  heading?: string;
  intro?: ReactNode;
  /** The controls for one row, decided by the tab. */
  actionsFor?: (b: Booking) => ReactNode;
  /** Rendered above the list (the Upcoming tab's hero). */
  children?: ReactNode;
  now?: Date;
};

/**
 * One tab's content, with all four states. Error is checked before empty: a
 * failed load that reads "No past sessions yet" tells someone their history is
 * gone.
 */
export function BookingsPanel({
  tab,
  bookings,
  isLoading,
  error,
  retry,
  timeZone,
  isMentor,
  filtered = false,
  shown,
  showMore,
  total,
  hasMore,
  isLoadingMore,
  loadMoreError,
  heading,
  intro,
  actionsFor,
  children,
  now,
}: BookingsPanelProps) {
  if (isLoading) return <PanelSkeleton />;

  // Only when there is nothing to show. A background refetch that fails (the
  // list is refetched on refocus) must not replace a list someone is reading
  // with an error — the profile does the same.
  if (error && bookings.length === 0) {
    const offline = error.kind === 'offline';
    return (
      <div className={styles.state}>
        <EmptyState
          illustration="forms"
          size={120}
          title="We couldn’t load your bookings"
          description={
            offline
              ? 'You’re offline. Try again when you reconnect.'
              : 'Something went wrong on our side. Try again in a moment.'
          }
          actions={
            <Button size="large" onClick={retry}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  if (bookings.length === 0 && !children) {
    const copy = emptyFor(tab, isMentor, filtered);
    return (
      <div className={styles.state}>
        <EmptyState
          illustration={copy.illustration}
          size={120}
          title={copy.title}
          description={copy.description}
          actions={
            copy.action && (
              <ButtonLink href={copy.action.href} prefetch={false} size="large">
                {copy.action.label}
              </ButtonLink>
            )
          }
        />
      </div>
    );
  }

  const visible = bookings.slice(0, shown);
  // More to reveal here, or another page waiting on the server.
  const more = bookings.length > shown || !!hasMore;
  const left = total != null ? total - shown : null;

  return (
    <>
      {children}
      {visible.length > 0 && (
        <BookingList
          label={heading ?? 'Bookings'}
          heading={heading}
          intro={intro}
          more={
            more
              ? {
                  label: `Show ${left != null ? Math.min(PAGE_SIZE, left) : PAGE_SIZE} more`,
                  caption:
                    total != null
                      ? `Showing ${Math.min(shown, total)} of ${total}`
                      : `Showing ${visible.length}`,
                  onClick: showMore,
                  busy: isLoadingMore,
                  error: loadMoreError
                    ? loadMoreError.kind === 'offline'
                      ? 'You’re offline. Try again when you reconnect.'
                      : 'We couldn’t load more. Try again.'
                    : undefined,
                }
              : undefined
          }
        >
          {visible.map((b) => (
            <BookingRow
              key={b.id}
              booking={b}
              timeZone={timeZone}
              actions={actionsFor?.(b)}
              now={now}
            />
          ))}
        </BookingList>
      )}
    </>
  );
}

function PanelSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <Skeleton height="96px" radius="lg" />
      <Skeleton height="96px" radius="lg" />
      <Skeleton height="96px" radius="lg" />
    </div>
  );
}
