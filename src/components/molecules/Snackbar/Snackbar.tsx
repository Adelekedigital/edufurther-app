import styles from './Snackbar.module.css';

/**
 * A short outcome at the bottom of the screen (Mentee Settings.dc.html
 * `hasToast`): "Profile saved". The status region is always in the page and
 * the message is put inside it, so it is read out.
 */
export function Snackbar({ message }: { message: string | null }) {
  return (
    <div role="status" className={styles.region}>
      {message && <div className={styles.toast}>{message}</div>}
    </div>
  );
}
