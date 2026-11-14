'use client';

import { forwardRef, useId, useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { ExternalLink } from '@/components/atoms/ExternalLink/ExternalLink';
import { IconButton } from '@/components/atoms/IconButton/IconButton';
import { LEGAL_LINKS } from '@/lib/config/auth';
import { CONSENT_COPY as C } from '@/lib/copy/consent';
import styles from './ConsentBanner.module.css';

export type ConsentBannerProps = {
  onAccept: () => void;
  onDecline: () => void;
  /** The corner X. Counts as "Essential only"; the page says how it was recorded. */
  onClose: () => void;
  /** A member can change the answer in Settings; a guest has no Settings, so isn't told to. */
  signedIn?: boolean;
};

/**
 * The analytics cookies ask (PRD 30), built from the design system: a card
 * fixed at the bottom of the viewport, so it moves nothing on the page. A
 * labelled region, not a dialog: it never traps focus, and the page works
 * underneath. Decline and Accept are the same size, side by side, so saying
 * no is as easy as yes. The page decides when it shows and what an answer
 * does (app/_shell/AnalyticsRoot).
 *
 * Compact + close (owner, 2026-11-13): collapsed it is one short question, so
 * it leaves log-in and sign-up visible on a phone; "Learn more" opens the full
 * text in place. The X answers "Essential only". Escape deliberately does NOT
 * close it: it isn't a dialog, and a key that silently refuses analytics would
 * surprise a keyboard user who pressed it for something else on the page.
 */
export const ConsentBanner = forwardRef<HTMLElement, ConsentBannerProps>(function ConsentBanner(
  { onAccept, onDecline, onClose, signedIn = false },
  ref,
) {
  const titleId = useId();
  const moreId = useId();
  const [open, setOpen] = useState(false);
  return (
    <section ref={ref} className={styles.banner} aria-labelledby={titleId}>
      <IconButton
        icon="close"
        size="lg"
        glyph={20}
        aria-label={C.close}
        className={styles.close}
        onClick={onClose}
      />
      <p className={styles.lead}>
        <span id={titleId} className={styles.title}>
          {C.short}
        </span>{' '}
        <span className={styles.links}>
          <Button
            variant="text"
            size="small"
            className={styles.more}
            aria-expanded={open}
            aria-controls={moreId}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? C.less : C.more}
          </Button>
          <span aria-hidden className={styles.dot}>
            ·
          </span>
          <ExternalLink href={LEGAL_LINKS.privacy} label={C.privacy} className={styles.link} />
        </span>
      </p>
      <p id={moreId} className={styles.body} hidden={!open}>
        {C.body}
        {signedIn && ` ${C.change}`}
      </p>
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
