'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { Notice } from '@/components/molecules/Notice/Notice';
import type { ShareKind, ShareMethod } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';
import { cx } from '@/lib/utils/cx';
import { useCopyText } from '@/lib/utils/useCopyText';
import styles from './LinkSharePanel.module.css';

/** The link as shown: host and path, no scheme. */
export const displayUrl = (url: string) => url.replace(/^https?:\/\//, '');

/**
 * What a shared link says and counts as: the words for one kind of link (an
 * invite, a mentor's profile). The link's own states default to plain words;
 * a link that can load, fail or be turned off names itself.
 */
export type LinkShareContent = {
  /** link_shared `kind`. */
  kind: ShareKind;
  /** link_shared `own`: the viewer shares their own link. */
  own: boolean;
  /** What Copy (and Share without a share sheet) puts on the clipboard. */
  copyText: (url: string) => string;
  /** What the system share sheet carries with the link. */
  share: (url: string) => ShareData;
  /** The Copy button's label, and its label just after a copy. */
  copyLabel: string;
  copiedLabel: string;
  /** Said while the link loads, after it failed, and while it's turned off. */
  loading?: string;
  failed?: string;
  off?: { title: string; body: string };
};

/** A link the page already has (a profile's URL): nothing to load or retry. */
type KnownLink = { url: string; urlLoading?: never; urlError?: never; onRetry?: never };
/**
 * A link that's fetched (the invite): null until it has loaded. One that can
 * fail always comes with its retry, so the failed state offers Try again.
 */
type FetchedLink = {
  url: string | null;
  urlLoading: boolean;
  urlError: boolean;
  onRetry: () => void;
};

/** The link's own state, as a caller hands it on (layout and words set by the place). */
export type LinkShareState = (KnownLink | FetchedLink) & {
  /** False: the link is revoked, so it shows as off and can't be shared. */
  linkActive?: boolean;
  /**
   * Counts the share in place of the panel's own `link_shared`: a mentor
   * profile's goes through profileShared (lib/api/data/profileLinks), which
   * sends the event and our record together, so the two can't drift.
   */
  count?: (method: ShareMethod) => void;
  /** Called once the link was copied or shared (and counted), with how. */
  onShared?: (method: ShareMethod) => void;
};

export type LinkSharePanelProps = LinkShareState & {
  /**
   * `modal` (InviteModal.dc.html): a grey box, then Copy and Share stacked full
   * width. `card` (Mentee Dashboard v2.dc.html next step): a white box, then
   * Copy and a text Share side by side (stacked full width on phones).
   */
  layout?: 'modal' | 'card';
  content: LinkShareContent;
};

const COPIED = 'Link copied';
const COPY_FAILED = 'Couldn’t copy the link. Try again.';

/**
 * A link with its two actions, Copy and Share, plus the link's own loading,
 * failed and turned-off states. The one piece wherever a link is offered to
 * pass on (the invite modal, Home's next step, sharing a mentor's profile).
 * Share opens the device's share sheet; where there is none, it copies.
 */
export function LinkSharePanel({
  url,
  urlLoading = false,
  urlError = false,
  onRetry,
  linkActive = true,
  count,
  onShared,
  layout = 'modal',
  content,
}: LinkSharePanelProps) {
  const { state: copyState, copy } = useCopyText(2000);
  const [said, setSaid] = useState<{ text: string; id: number } | null>(null);
  const n = useRef(0);
  const say = (text: string) => setSaid({ text, id: ++n.current });
  const { kind, own } = content;

  const linkOff = url !== null && !urlLoading && !urlError && !linkActive;
  const ready = url !== null && !urlLoading && !urlError && linkActive;
  const card = layout === 'card';

  const shared = (method: ShareMethod) => {
    if (count) count(method);
    else track('link_shared', { kind, method, own });
    onShared?.(method);
  };

  const copyLink = async () => {
    if (!url) return;
    // The same words Share sends, so a pasted link says what it is.
    const copied = await copy(content.copyText(url));
    say(copied ? COPIED : COPY_FAILED);
    if (copied) shared('copy');
  };

  const share = async () => {
    if (!url) return;
    const payload = content.share(url);
    // Checked first, so the fallback copy still runs inside the click: after a
    // refused share the gesture is spent and Safari would refuse the copy too.
    if (typeof navigator.share !== 'function' || navigator.canShare?.(payload) === false) {
      return copyLink();
    }
    try {
      await navigator.share(payload);
      shared('native');
    } catch (e) {
      // Dismissing the share sheet is not a failure. Anything else falls back
      // to copying, as no share at all does.
      if ((e as { name?: string } | null)?.name !== 'AbortError') await copyLink();
    }
  };

  return (
    <>
      {urlError ? (
        <Notice tone="neutral" icon="error" title={content.failed ?? 'We couldn’t load the link.'}>
          {onRetry && (
            <Button variant="text" onClick={onRetry}>
              Try again
            </Button>
          )}
        </Notice>
      ) : linkOff ? (
        <Notice tone="neutral" icon="link_off" title={content.off?.title ?? 'This link is off.'}>
          {content.off?.body ?? 'Nobody can open it for now.'}
        </Notice>
      ) : !ready ? (
        <div aria-busy={urlLoading || undefined} className={cx(card && styles.cardWidth)}>
          {urlLoading && <span className="sr-only">{content.loading ?? 'Loading the link'}</span>}
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
          {copyState === 'copied' ? content.copiedLabel : content.copyLabel}
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
