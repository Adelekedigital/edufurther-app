import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { LOAD_MORE_COPY } from '@/lib/copy/loadMore';
import { cx } from '@/lib/utils/cx';
import styles from './LoadMore.module.css';

export type LoadMoreProps = {
  /** "Show 5 more reviews" (`showMoreLabel`). */
  label: string;
  onLoadMore: () => void;
  /** "Showing 5 of 13". Left out when there's nothing worth saying. */
  caption?: string;
  /** Explore draws the caption above the button; Bookings and reviews below it. */
  captionFirst?: boolean;
  busy?: boolean;
  /** Said on the button while busy ("Loading mentors…"); else the label stays. */
  busyLabel?: string;
  /** Can't load now (offline). The button stays visible, dimmed. */
  disabled?: boolean;
  /** The last attempt failed: said where the click was, with Try again. */
  error?: string | null;
  className?: string;
};

/**
 * The "Show more" footer every paged list shares (Explore.dc.html pager): a
 * centred column of the outlined button and its caption, the button busy while
 * the next page loads, and on failure an error row with Try again in its place.
 * A real button, not a scroll sentinel: keyboard and screen-reader users can't
 * trigger one. Props only; the page pages.
 */
export function LoadMore({
  label,
  onLoadMore,
  caption,
  captionFirst = false,
  busy,
  busyLabel,
  disabled,
  error,
  className,
}: LoadMoreProps) {
  if (error) {
    return (
      <div className={cx(styles.more, className)}>
        <span role="alert" className={styles.error}>
          <Icon name="error" size={18} className={styles.errorIcon} />
          {error}
        </span>
        {/* Busy while the retry loads (the error stays until it lands), and
            inert offline, like the button it stands in for. */}
        <Button variant="secondary-outlined" onClick={onLoadMore} disabled={disabled} busy={busy}>
          {LOAD_MORE_COPY.retry}
        </Button>
      </div>
    );
  }
  const captionEl = caption ? <span className={styles.caption}>{caption}</span> : null;
  return (
    <div className={cx(styles.more, className)}>
      {captionFirst && captionEl}
      <Button variant="secondary-outlined" onClick={onLoadMore} disabled={disabled} busy={busy}>
        {busy && busyLabel ? busyLabel : label}
      </Button>
      {!captionFirst && captionEl}
    </div>
  );
}
