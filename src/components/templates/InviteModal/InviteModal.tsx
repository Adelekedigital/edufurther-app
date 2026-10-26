'use client';

import { useRef, useState } from 'react';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { Notice } from '@/components/molecules/Notice/Notice';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { cx } from '@/lib/utils/cx';
import { useCopyText } from '@/lib/utils/useCopyText';
import styles from './InviteModal.module.css';

export const INVITE_SHARE = {
  title: 'Join me on EduFurther',
  text: 'I’m using EduFurther to get advice from people who’ve done what I’m aiming for. Your first session is free:',
} as const;

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

/** The URL as the box shows it: host and path, no scheme (InviteModal.dc.html). */
export const displayUrl = (url: string) => url.replace(/^https?:\/\//, '');

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
  const { state: copyState, copy } = useCopyText(2000);
  const [said, setSaid] = useState<{ text: string; id: number } | null>(null);
  const n = useRef(0);
  const say = (text: string) => setSaid({ text, id: ++n.current });

  const linkOff = url !== null && !urlLoading && !urlError && !linkActive;
  const ready = url !== null && !urlLoading && !urlError && linkActive;

  const copyLink = async () => {
    if (!url) return;
    const copied = await copy(url);
    say(copied ? 'Link copied' : 'Couldn’t copy the link. Try again.');
    if (copied) onShared?.();
  };

  const share = async () => {
    if (!url) return;
    const payload = { ...INVITE_SHARE, url };
    // Checked first, so the fallback copy still runs inside the click: after a
    // refused share the gesture is spent and Safari would refuse the copy too.
    if (typeof navigator.share !== 'function' || navigator.canShare?.(payload) === false) {
      return copyLink();
    }
    try {
      await navigator.share(payload);
      onShared?.();
    } catch (e) {
      // Dismissing the share sheet is not a failure. Anything else falls back
      // to copying, as no share at all does.
      if ((e as { name?: string } | null)?.name !== 'AbortError') await copyLink();
    }
  };

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

        {urlError ? (
          <Notice tone="neutral" icon="error" title="We couldn’t load your invite link.">
            <Button variant="text" onClick={onRetry}>
              Try again
            </Button>
          </Notice>
        ) : linkOff ? (
          <Notice tone="neutral" icon="link_off" title="Your invite link is turned off.">
            Nobody can join through it for now.
          </Notice>
        ) : !ready ? (
          <div aria-busy={urlLoading || undefined}>
            {urlLoading && <span className="sr-only">Loading your invite link</span>}
            <Skeleton height="48px" radius="md" />
          </div>
        ) : (
          <div className={styles.link}>
            <Icon name="link" size={20} className={styles.linkIcon} />
            <span className={styles.linkText} title={displayUrl(url)}>
              {displayUrl(url)}
            </span>
          </div>
        )}

        <div className={styles.actions}>
          <Button
            variant="primary"
            size="large"
            fullWidth
            unavailable={!ready}
            onClick={() => void copyLink()}
          >
            {copyState === 'copied' ? 'Link copied' : 'Copy invite link'}
          </Button>
          <Button
            variant="secondary-outlined"
            size="large"
            fullWidth
            unavailable={!ready}
            onClick={() => void share()}
          >
            Share
          </Button>
        </div>

        {!unlocked && <p className={styles.note}>Your friend gets a free first session.</p>}
      </div>
      <LiveRegion message={said} />
    </ModalShell>
  );
}
