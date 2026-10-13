import { Icon } from '@/components/atoms/Icon/Icon';
import { cx } from '@/lib/utils/cx';
import styles from './DetailsButton.module.css';

type DetailsButtonProps = {
  /**
   * What this opens the details *of* — "Visa practice with Amara". The
   * accessible name becomes "Details for {name}": a list of rows all reading
   * "Details" tells a screen-reader user which control they are on and nothing
   * else.
   */
  name: string;
  /** The panel's element id, when one is on the page to point at. */
  controls?: string;
  /**
   * Whether that panel is open *right now*. It is a toggle — pressing it again
   * closes the panel — and the label cannot say so, because the design fixes it
   * at "Details" (`Bookings.dc.html`, `detailsAccess: 'corner'`). The ⋯ this
   * replaced said it twice, in `aria-expanded` and in a "Hide details" label,
   * so without this a screen-reader user hears the same thing in both states
   * and cannot tell that pressing it will close what they are reading.
   */
  expanded?: boolean;
  onClick: () => void;
  className?: string;
};

/**
 * The corner control on a booking row, and on the hero card above the list.
 *
 * It lives here rather than in either organism because both need it identically
 * — it was hand-rolled twice, down to the same `gap: 2px` — and because a
 * control this load-bearing should render and be tested on its own before
 * anything consumes it.
 */
export function DetailsButton({ name, controls, expanded, onClick, className }: DetailsButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Details for ${name}`}
      aria-controls={controls}
      aria-expanded={expanded}
      className={cx(styles.details, className)}
    >
      Details
      <Icon name="chevron_right" size={18} />
    </button>
  );
}
