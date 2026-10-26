'use client';

import { Badge } from '@/components/atoms/Badge/Badge';
import { Icon } from '@/components/atoms/Icon/Icon';
import { InviteLinkPanel } from '@/components/molecules/InviteLinkPanel/InviteLinkPanel';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { cx } from '@/lib/utils/cx';
import styles from './InviteModal.module.css';

const SUBTITLE_LOCKED = 'Get 3 free sessions every month.';
const SUBTITLE_UNLOCKED =
  'Think of someone you’d love to walk this path with. Give them a free first session with a mentor who’s been where they want to go.';

export type InviteModalProps = {
  /** The absolute invite URL; null while it loads or after it failed. */
  url: string | null;
  urlLoading: boolean;
  /** The link couldn't be read: the box becomes a notice with `onRetry`. */
  urlError: boolean;
  onRetry: () => void;
  /**
   * False while the owner has revoked the link (`InviteLink.active`): the code
   * then answers as unknown, so it is never offered to copy or share.
   */
  linkActive?: boolean;
  /** A friend joined through the link and finished their profile. */
  friendJoined: boolean;
  /** The viewer attended their first session. */
  attended: boolean;
  /**
   * The monthly grant is open: the badge instead of the steps. Its own prop,
   * from the credits grant, rather than both steps done (design-divergence.md).
   */
  unlocked: boolean;
  /** The link was copied or shared. */
  onShared?: () => void;
  onClose: () => void;
};

/**
 * Invite a friend (InviteModal.dc.html, in Modal.dc.html `kind="explainer"`,
 * size sm, a bottom sheet on phones). Before the monthly grant opens it shows
 * the two steps to it; after, a badge and the reason to share.
 */
export function InviteModal({
  url,
  urlLoading,
  urlError,
  onRetry,
  linkActive = true,
  friendJoined,
  attended,
  unlocked,
  onShared,
  onClose,
}: InviteModalProps) {
  const steps = [
    {
      key: 'friend',
      done: friendJoined,
      label: friendJoined
        ? 'A friend joined and set up their profile'
        : 'A friend joins through your link',
    },
    {
      key: 'attend',
      done: attended,
      label: attended ? 'You attended your first session' : 'You attend your first session',
    },
  ];

  return (
    <ModalShell
      title="Invite a friend"
      subtitle={unlocked ? SUBTITLE_UNLOCKED : SUBTITLE_LOCKED}
      icon="group_add"
      size="sm"
      mobile="sheet"
      onClose={onClose}
    >
      <div className={styles.body}>
        {unlocked ? (
          <Badge type="accent" color="green" icon="check_circle" className={styles.badge}>
            You get 3 free sessions a month
          </Badge>
        ) : (
          <ul className={styles.steps} aria-label="How to get 3 free sessions every month">
            {steps.map((s) => (
              <li key={s.key} className={cx(styles.step, s.done && styles.done)}>
                <span className={styles.ring} aria-hidden>
                  {s.done && <Icon name="check" size={16} />}
                </span>
                {/* The tense says done or not, so the ring can stay decorative. */}
                <span className={styles.stepLabel}>{s.label}</span>
              </li>
            ))}
          </ul>
        )}

        <InviteLinkPanel
          url={url}
          urlLoading={urlLoading}
          urlError={urlError}
          onRetry={onRetry}
          linkActive={linkActive}
          onShared={onShared}
        />

        {!unlocked && <p className={styles.note}>Your friend gets a free first session.</p>}
      </div>
    </ModalShell>
  );
}
