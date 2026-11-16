'use client';

import { LinkSharePanel } from '@/components/molecules/LinkSharePanel/LinkSharePanel';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import type { ShareMethod } from '@/lib/analytics/events';
import { MENTOR_SHARE_COPY } from '@/lib/copy/mentorShare';
import styles from './ShareProfileModal.module.css';

export type ShareProfileModalProps = {
  /** Absolute URL of the profile. */
  url: string;
  /** The mentor's full name, for the title and the message. */
  name: string;
  /**
   * The viewer's own profile: first-person title and message, and link_shared
   * `own` (only own shares count toward activation).
   */
  own?: boolean;
  /**
   * Who can see the page, for an owner whose profile isn't public yet (Mentor
   * Profile.dc.html `shareNote`). Shown in place of the subtitle: it's what the
   * sharer needs to know first. The link still works.
   */
  note?: string;
  /**
   * The link was copied or shared, and how: the caller records the share
   * (recordProfileShare) and Mentor Home marks its Share step done.
   */
  onShared?: (method: ShareMethod) => void;
  onClose: () => void;
};

/**
 * Share a mentor's profile (owner, 2026-11-14): the invite's pattern, a modal
 * from 768px and a bottom sheet on phones, holding the link, Copy and Share.
 * Share is the device's share sheet (WhatsApp, X, email and the rest live
 * there); without one it copies.
 */
export function ShareProfileModal({
  url,
  name,
  own = false,
  note,
  onShared,
  onClose,
}: ShareProfileModalProps) {
  return (
    <ModalShell
      title={MENTOR_SHARE_COPY.modal.title(own, name)}
      subtitle={note ?? MENTOR_SHARE_COPY.modal.subtitle(own)}
      icon="ios_share"
      size="sm"
      mobile="sheet"
      onClose={onClose}
    >
      <div className={styles.body}>
        <LinkSharePanel
          url={url}
          onShared={onShared}
          content={MENTOR_SHARE_COPY.panel(own, name)}
        />
      </div>
    </ModalShell>
  );
}
