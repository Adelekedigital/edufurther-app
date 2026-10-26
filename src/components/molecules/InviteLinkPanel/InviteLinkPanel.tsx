'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { Notice } from '@/components/molecules/Notice/Notice';
import { cx } from '@/lib/utils/cx';
import { useCopyText } from '@/lib/utils/useCopyText';
import styles from './InviteLinkPanel.module.css';

/** What the native share sheet carries with the link (InviteModal.dc.html). */
export const INVITE_SHARE = {
  title: 'Join me on EduFurther',
  text: 'I’m using EduFurther to get advice from people who’ve done what I’m aiming for. Your first session is free:',
} as const;

/** The link as shown: host and path, no scheme. */
export const displayUrl = (url: string) => url.replace(/^https?:\/\//, '');

export type InviteLinkPanelProps = {
  /** The full invite link; null until it has loaded. */
  url: string | null;
  urlLoading: boolean;
  urlError: boolean;
  onRetry: () => void;
  /** False: the link is revoked, so it shows as off and can't be shared. */
  linkActive?: boolean;
  /** Called once the link was copied or shared. */
  onShared?: () => void;
  /**
   * `modal` (InviteModal.dc.html): a grey box, then Copy and Share stacked full
   * width. `card` (Mentee Dashboard v2.dc.html next step): a white box, then
   * Copy and a text Share side by side (stacked full width on phones).
   */
  layout?: 'modal' | 'card';
};

/**
 * An invite link with its two actions, Copy invite link and Share, plus the
 * link's own loading, failed and turned-off states. One piece wherever the link
 * is offered (InviteModal, Home's next step).
 */
export function InviteLinkPanel({
  url,
  urlLoading,
  urlError,
  onRetry,
  linkActive = true,
  onShared,
  layout = 'modal',
}: InviteLinkPanelProps) {
  const { state: copyState, copy } = useCopyText(2000);
  const [said, setSaid] = useState<{ text: string; id: number } | null>(null);
  const n = useRef(0);
  const say = (text: string) => setSaid({ text, id: ++n.current });

  const linkOff = url !== null && !urlLoading && !urlError && !linkActive;
  const ready = url !== null && !urlLoading && !urlError && linkActive;
  const card = layout === 'card';

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

  return (
    <>
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
        <div aria-busy={urlLoading || undefined} className={cx(card && styles.cardWidth)}>
          {urlLoading && <span className="sr-only">Loading your invite link</span>}
          <Skeleton height="48px" radius="md" />
        </div>
      ) : (
        <div className={cx(styles.link, card && styles.cardLink)}>
          <Icon name="link" size={20} className={styles.linkIcon} />
          <span className={styles.linkText} title={displayUrl(url)}>
            {displayUrl(url)}
          </span>
        </div>
      )}

      <div className={cx(styles.actions, card && styles.cardActions)}>
        <Button
          variant="primary"
          size="large"
          fullWidth={!card}
          unavailable={!ready}
          onClick={() => void copyLink()}
        >
          {copyState === 'copied' ? 'Link copied' : 'Copy invite link'}
        </Button>
        <Button
          variant={card ? 'text' : 'secondary-outlined'}
          size="large"
          fullWidth={!card}
          className={cx(card && styles.cardShare)}
          unavailable={!ready}
          onClick={() => void share()}
        >
          Share
        </Button>
      </div>
      <LiveRegion message={said} />
    </>
  );
}
