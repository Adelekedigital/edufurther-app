import { Icon } from '@/components/atoms/Icon/Icon';
import styles from './MatchPrompt.module.css';

type MatchPromptProps = {
  body: string;
  /** Where "Find my mentor matches" goes. */
  href: string;
  /** True for an off-platform link: opens in a new tab and says so. */
  external?: boolean;
};

/**
 * "Not sure who's right for you?" panel (Design decisions: Explore, match prompt).
 * The CTA is deliberately secondary (green outline) so it never competes with Book.
 */
export function MatchPrompt({ body, href, external }: MatchPromptProps) {
  return (
    <section aria-labelledby="match-prompt-title" className={styles.prompt}>
      <span className={styles.badge} aria-hidden>
        <Icon name="route" size={22} />
      </span>
      <div className={styles.copy}>
        <h2 id="match-prompt-title" className={styles.title}>
          Not sure who’s right for you?
        </h2>
        <p className={styles.body}>{body}</p>
      </div>
      <a
        href={href}
        className={styles.cta}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        Find my mentor matches
        <Icon name={external ? 'open_in_new' : 'arrow_forward'} size={16} />
        {external && <span className="sr-only"> (opens in a new tab)</span>}
      </a>
    </section>
  );
}
