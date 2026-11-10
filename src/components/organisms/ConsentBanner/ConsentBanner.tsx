import { forwardRef, useId } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { ExternalLink } from '@/components/atoms/ExternalLink/ExternalLink';
import { LEGAL_LINKS } from '@/lib/config/auth';
import { CONSENT_COPY as C } from '@/lib/copy/consent';
import styles from './ConsentBanner.module.css';

export type ConsentBannerProps = {
  onAccept: () => void;
  onDecline: () => void;
};

/**
 * The analytics cookies ask (PRD 30), built from the design system: a card
 * fixed at the bottom of the viewport, so it moves nothing on the page. A
 * labelled region, not a dialog: it never traps focus, and the page works
 * underneath. Decline and Accept are the same size, side by side, so saying
 * no is as easy as yes. The page decides when it shows and what an answer
 * does (app/_shell/AnalyticsRoot).
 */
export const ConsentBanner = forwardRef<HTMLElement, ConsentBannerProps>(function ConsentBanner(
  { onAccept, onDecline },
  ref,
) {
  const titleId = useId();
  return (
    <section ref={ref} className={styles.banner} aria-labelledby={titleId}>
      <div className={styles.text}>
        <p id={titleId} className={styles.title}>
          {C.title}
        </p>
        <p className={styles.body}>
          {C.body}{' '}
          <ExternalLink href={LEGAL_LINKS.privacy} label={C.privacy} className={styles.link} />
        </p>
      </div>
      <div className={styles.actions}>
        <Button variant="secondary-outlined" size="medium" onClick={onDecline}>
          {C.decline}
        </Button>
        <Button variant="primary" size="medium" onClick={onAccept}>
          {C.accept}
        </Button>
      </div>
    </section>
  );
});
