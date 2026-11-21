'use client';

import { useId } from 'react';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Button } from '@/components/atoms/Button/Button';
import { IconListItem } from '@/components/molecules/IconListItem/IconListItem';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { TOUR_COPY as C, type TourRoleContent } from '@/lib/copy/whatsNew';
import styles from './WhatsNewTour.module.css';

/**
 * The tour's welcome: a centred 480px dialog on desktop, a bottom sheet on
 * phones (ModalShell `mobile="sheet"`). The close, Escape and "Not now" all
 * dismiss it (and mark it seen, the caller's part).
 */
export function TourWelcome({
  first,
  welcome,
  onStart,
  onDismiss,
}: {
  first: string;
  welcome: TourRoleContent['welcome'];
  onStart: () => void;
  onDismiss: () => void;
}) {
  const bodyId = useId();
  return (
    <ModalShell
      title={C.welcomeTitle(first)}
      eyebrow={
        <span className={styles.eyebrow}>
          <Badge type="accent" color="primary" size="md">
            {C.badge}
          </Badge>
        </span>
      }
      size="md"
      mobile="sheet"
      describedBy={bodyId}
      onClose={onDismiss}
    >
      <p id={bodyId} className={styles.welcomeBody}>
        {welcome.body}
      </p>
      <ul className={styles.rows}>
        {welcome.rows.map((r) => (
          <IconListItem
            key={r.title}
            as="li"
            variant="feature"
            tone="blue"
            icon={r.icon}
            title={r.title}
            meta={r.meta}
          />
        ))}
      </ul>
      <div className={styles.welcomeActions}>
        <Button variant="primary" size="large" fullWidth data-autofocus onClick={onStart}>
          {C.showMe}
        </Button>
        <Button variant="text" size="large" fullWidth onClick={onDismiss}>
          {C.notNow}
        </Button>
        <p className={styles.hint}>{C.hint}</p>
      </div>
    </ModalShell>
  );
}
