import styles from './SupportLine.module.css';

type SupportLineProps = {
  /** "Having a problem?" */
  lead: string;
  /** "Contact support". */
  linkLabel: string;
  /** A prefilled `mailto:` to support (supportMailto). */
  href: string;
};

/** "Having a problem? Contact support": one quiet line with a way to reach support. */
export function SupportLine({ lead, linkLabel, href }: SupportLineProps) {
  return (
    <p className={styles.line}>
      {lead}{' '}
      <a href={href} className={styles.link}>
        {linkLabel}
      </a>
    </p>
  );
}
