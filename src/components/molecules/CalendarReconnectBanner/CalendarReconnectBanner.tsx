import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { RECONNECT_COPY } from '@/lib/copy/integrations';
import styles from './CalendarReconnectBanner.module.css';

type CalendarReconnectBannerProps = {
  /** The consent window is open. */
  busy: boolean;
  /** No Google client on this deployment: the button stops offering. */
  unavailable: boolean;
  /** Why the last attempt did not land. Shown under the line, not as a toast. */
  failure: string | null;
  onReconnect: () => void;
};

/**
 * "Google Calendar needs reconnecting" (PRD: Integrations, 21 Oct, decision 5),
 * on Calendar and Mentor Home. Drawn on `SetupBanner`, which is the house
 * banner shape; the tone is warning rather than neutral because this one
 * reports something already going wrong.
 *
 * No dismiss, deliberately. It is not an announcement a mentor can be done
 * with: while it shows, their busy times are bookable. It goes when the
 * connection is repaired, and nowhere else.
 *
 * Props only, so the screen owns the fetch (`useCalendarReconnect`).
 */
export function CalendarReconnectBanner({
  busy,
  unavailable,
  failure,
  onReconnect,
}: CalendarReconnectBannerProps) {
  return (
    <section aria-label="Google Calendar" className={styles.banner}>
      <Icon name="event_busy" size={20} className={styles.icon} />
      <div className={styles.body}>
        <p className={styles.line}>
          <strong className={styles.lead}>{RECONNECT_COPY.title}</strong> {RECONNECT_COPY.body}
        </p>
        {busy ? (
          // `busy` on a Button is cursor-only, so without this the mentor sees
          // an unchanged button that swallows every press (divergence row 375).
          <p className={styles.note}>
            <Icon name="progress_activity" size={16} className={styles.spin} />
            {RECONNECT_COPY.busy}
          </p>
        ) : (
          failure && (
            // Plain, not role="alert": useCalendarReconnect announces this
            // same sentence, and two live regions with one text read it twice.
            <p className={styles.note}>
              <Icon name="error" size={16} className={styles.failIcon} />
              {failure}
            </p>
          )
        )}
      </div>
      <Button
        variant="secondary-outlined"
        size="small"
        busy={busy}
        disabled={unavailable}
        onClick={onReconnect}
      >
        {RECONNECT_COPY.action}
      </Button>
    </section>
  );
}
