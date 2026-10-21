import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { RECONNECT_COPY } from '@/lib/copy/integrations';
import styles from './CalendarReconnectBanner.module.css';

type CalendarReconnectBannerProps = {
  /** The consent window is open. */
  busy: boolean;
  /** No Google client on this deployment: the button stops offering. */
  unavailable: boolean;
  /** Why the last attempt did not land. Undrawn: the design navigates away. */
  failure: string | null;
  onReconnect: () => void;
};

/**
 * "Google Calendar needs reconnecting" (Calendar v2.dc.html
 * `calendarSync=needsReconnect`), on Calendar and Mentor Home.
 *
 * `role="alert"` as drawn, and it earns it: it appears when a mentor's busy
 * times have already stopped being hidden, so they can be double-booked while
 * they read it. It is also why the second line is not announced separately —
 * this region speaks its own changes, and a screen live region repeating the
 * sentence would read it twice.
 *
 * No dismiss, deliberately. It is not an announcement a mentor can be done
 * with; it goes when the connection is repaired and nowhere else.
 *
 * The design's button navigates to Integrations. The founder overrode that:
 * reconnecting happens in place (PRD decision 5), which is the point of
 * putting it on a screen the mentor was already on.
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
    <div role="alert" className={styles.banner}>
      <Icon name="sync_problem" size={20} className={styles.icon} />
      <span className={styles.text}>{RECONNECT_COPY.line}</span>
      <Button
        variant="secondary-outlined"
        size="medium"
        busy={busy}
        disabled={unavailable}
        onClick={onReconnect}
      >
        {RECONNECT_COPY.action}
      </Button>
      {/* Undrawn — the drawn banner is one row because its button leaves the
          page. Reconnecting in place has outcomes, and they belong here rather
          than in a toast the mentor may not see. Full width, so the drawn row
          above is untouched whenever there is nothing to say. */}
      {(busy || failure) && (
        <p className={styles.note}>
          {busy ? (
            <>
              <Icon name="progress_activity" size={16} className={styles.spin} />
              {RECONNECT_COPY.busy}
            </>
          ) : (
            <>
              <Icon name="error" size={16} className={styles.failIcon} />
              {failure}
            </>
          )}
        </p>
      )}
    </div>
  );
}
