import type { ReactNode } from 'react';
import { LoadMore, type LoadMoreProps } from '@/components/molecules/LoadMore/LoadMore';
import styles from './BookingList.module.css';

type BookingListProps = {
  /** Names the list for assistive technology, e.g. "Later sessions". */
  label: string;
  /** The visible heading above the box ("Later"). */
  heading?: string;
  /** A line of context above the box (the Pending tab's explanation). */
  intro?: ReactNode;
  children: ReactNode;
  /** The shared "Show more" footer, under the box. */
  more?: Omit<LoadMoreProps, 'className' | 'captionFirst'>;
};

/**
 * One tab's list of bookings (Bookings.dc.html, `layout=agendaV2`): a bordered
 * box of rows, with the design's "Show more" footer under it.
 *
 * The footer reveals rows five at a time rather than paging. Nothing leaves the
 * screen when more arrives, so the row someone was reading stays where it was —
 * the usual complaint about a paged list of things you are comparing.
 */
export function BookingList({ label, heading, intro, children, more }: BookingListProps) {
  return (
    <section aria-label={label} className={styles.section}>
      {heading && <h2 className={styles.heading}>{heading}</h2>}
      {intro && <p className={styles.intro}>{intro}</p>}
      <div className={styles.box}>{children}</div>
      {more && <LoadMore {...more} className={styles.more} />}
    </section>
  );
}
