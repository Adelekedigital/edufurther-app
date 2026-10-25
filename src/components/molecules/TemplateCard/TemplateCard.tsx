import Link from 'next/link';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import styles from './TemplateCard.module.css';
import { cardClass } from '@/components/atoms/Card/Card';

type TemplateCardProps = {
  href: string;
  icon: IconName;
  name: string;
  /** e.g. "60 min · 2 questions". */
  hint: string;
  /** At the session limit: drawn the same, but not a link (PRD list: templates do nothing). */
  disabled?: boolean;
};

/**
 * "Start from a template" card (Session Types.dc.html `templates`). A link, not
 * a button: it opens the create form pre-filled, a real destination.
 */
export function TemplateCard({ href, icon, name, hint, disabled = false }: TemplateCardProps) {
  if (disabled)
    return (
      <div className={cardClass({ padding: 'md', className: `${styles.card} ${styles.off}` })}>
        <Icon name={icon} size={22} className={styles.icon} />
        <span className={styles.name}>{name}</span>
        <span className={styles.hint}>{hint}</span>
      </div>
    );
  return (
    <Link
      href={href}
      prefetch={false}
      className={cardClass({ padding: 'md', className: styles.card })}
    >
      <Icon name={icon} size={22} className={styles.icon} />
      <span className={styles.name}>{name}</span>
      <span className={styles.hint}>{hint}</span>
    </Link>
  );
}
