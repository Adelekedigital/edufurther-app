'use client';

import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import type { Created } from '@/lib/api/data/sessionTypes';
import { PUBLISHED_TITLE } from '@/lib/copy/sessionTypes';
import styles from './SessionTypesScreen.module.css';

/** Session Types.dc.html `wasEdit`: "Changes saved". */
export function SavedModal(p: {
  name: string;
  live: boolean;
  profileHref: string | null;
  onDone: () => void;
}) {
  return (
    <ModalShell
      mobile="sheet"
      title="Changes saved"
      subtitle={
        p.live
          ? `“${p.name}” is live on your profile. Mentees can book it in your open hours.`
          : // Copy confirmed by design (reply 2026-09-29, #8) (a hidden type isn't live).
            `“${p.name}” is saved. It’s hidden, so mentees can’t book it until you switch it on.`
      }
      icon="check_circle"
      tone="success"
      size="sm"
      onClose={p.onDone}
    >
      <div className={styles.buttons}>
        {p.live && p.profileHref && (
          <ButtonLink
            href={p.profileHref}
            prefetch={false}
            size="large"
            variant="secondary-outlined"
            fullWidth
          >
            View on profile
          </ButtonLink>
        )}
        <Button size="large" fullWidth onClick={p.onDone}>
          Done
        </Button>
      </div>
    </ModalShell>
  );
}

export function PublishedModal(p: {
  name: string;
  created: Created;
  profileHref: string;
  retrying: boolean;
  onRetry: () => void;
  onDone: () => void;
}) {
  const failed = p.created.failedWindows.length > 0;
  return (
    <ModalShell
      mobile="sheet"
      title={PUBLISHED_TITLE}
      subtitle={
        failed
          ? // Copy confirmed by design (reply 2026-09-29, #5).
            `“${p.name}” is live on your profile, but its dedicated hours didn’t save. Until they do, mentees book it in your Calendar hours.`
          : `“${p.name}” is live on your profile. Mentees can book it in your open hours.`
      }
      icon="check_circle"
      tone="success"
      size="sm"
      onClose={p.onDone}
    >
      <div className={styles.buttons}>
        {failed ? (
          <Button
            size="large"
            variant="secondary-outlined"
            fullWidth
            busy={p.retrying}
            onClick={p.onRetry}
          >
            Retry hours
          </Button>
        ) : (
          <ButtonLink
            href={p.profileHref}
            prefetch={false}
            size="large"
            variant="secondary-outlined"
            fullWidth
          >
            View on profile
          </ButtonLink>
        )}
        <Button size="large" fullWidth onClick={p.onDone}>
          Done
        </Button>
      </div>
    </ModalShell>
  );
}
