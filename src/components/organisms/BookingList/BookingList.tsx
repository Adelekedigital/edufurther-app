import type { ReactNode } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import styles from './BookingList.module.css';

type MoreProps = {
  /** "Show 5 more". */
  label: string;
  /** "Showing 5 of 13" — or, where no total is known, how many are shown. */
  caption: string;
  onClick: () => void;
  busy?: boolean;
};

type BookingListProps = {
  /** Names the list for assistive technology, e.g. "Later sessions". */
  label: string;
  /** The visible heading above the box ("Later"). */
  heading?: string;
  /** A line of context above the box (the Pending tab's explanation). */
  intro?: ReactNode;
  children: ReactNode;
  more?: MoreProps;
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
      {more && (
        <div className={styles.more}>
          <Button variant="secondary-outlined" size="medium" onClick={more.onClick} busy={more.busy}>
            {more.label}
          </Button>
          <span className={styles.count}>{more.caption}</span>
        </div>
      )}
    </section>
  );
}
