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
 * The drawn `role="alert"` is deliberately NOT carried over. It implies
 * `aria-atomic`, so every change inside re-read the whole banner assertively:
 * pressing Reconnect read the two sentences plus the button plus "Waiting for
 * Google…", and a failure read all of it again. It was also least reliable at
 * the moment that matters, because a live region inserted with its text
 * already in it is often not announced at all — the reason `Notice` has a
 * `live` prop and Calendar passes `live={false}`. A `.dc.html`'s runtime
 * semantics are mockup-only. So the wrapper is page content, met in reading
 * order, and only the line below it announces, politely, when it changes.
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
    <div className={styles.banner}>
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
        <p role="status" className={styles.note}>
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
